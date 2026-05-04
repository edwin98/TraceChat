import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import { createSSEStream } from "../api/client";
import { sendMainMessage } from "../api/conversations";
import { createBranch, getBranch, getMessageBranches } from "../api/branches";
import { MainMessageItem } from "./MainMessageItem";
import { SelectionToolbar } from "./SelectionToolbar";
import { MainComposer } from "./MainComposer";
import { MessageContent } from "./MessageContent";
import { useSelectionTracker } from "../hooks/useSelectionTracker";
import type { BranchIntent, BranchListItem } from "../types";

const INTENT_QUESTIONS: Record<BranchIntent, (text: string) => string> = {
  explain: (t) => `请解释：${t}`,
  background: (t) => `请提供关于"${t}"的背景和上下文`,
  derive: (t) => `请对以下内容做推导分析：${t}`,
  search: (t) => `请查询相关资料：${t}`,
  custom: (t) => t,
};

export function MainThread() {
  const {
    activeConversationId,
    mainMessages,
    streamingMainContent,
    isMainStreaming,
    selectedMainText,
    referencedBranchIds,
    branches,
    finalizeMainMessage,
    setStreamingMainContent,
    setIsMainStreaming,
    addMainMessage,
    setSelectedMainText,
    removeReferencedBranch,
    openBranchTab,
    setBranch,
    setBranchMessages,
  } = useChatStore();

  const [messageBranches, setMessageBranches] = useState<Record<string, BranchListItem[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(
    (sel: typeof selectedMainText) => {
      setSelectedMainText(sel);
    },
    [setSelectedMainText],
  );

  useSelectionTracker(handleSelectionChange);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mainMessages, streamingMainContent]);

  useEffect(() => {
    if (!mainMessages.length || !activeConversationId) return;
    const lastMsg = mainMessages[mainMessages.length - 1];
    if (lastMsg.role !== "assistant") return;
    loadBranchesForMessages();
  }, [mainMessages]);

  async function loadBranchesForMessages() {
    const assistantMsgs = mainMessages.filter((m) => m.role === "assistant");
    const updates: Record<string, BranchListItem[]> = {};
    await Promise.all(
      assistantMsgs.map(async (msg) => {
        const res = await getMessageBranches(msg.id);
        updates[msg.id] = res.branches as BranchListItem[];
      }),
    );
    setMessageBranches((prev) => ({ ...prev, ...updates }));
  }

  async function handleSend(content: string) {
    if (!activeConversationId || isMainStreaming) return;

    const res = await sendMainMessage(activeConversationId, content, referencedBranchIds);

    addMainMessage({
      id: res.user_message_id,
      conversation_id: activeConversationId,
      role: "user",
      content,
      message_index: mainMessages.length,
      created_at: new Date().toISOString(),
    });

    setIsMainStreaming(true);
    setStreamingMainContent("");

    let accumulated = "";
    createSSEStream(
      res.stream_url,
      (chunk) => {
        accumulated += chunk;
        setStreamingMainContent(accumulated);
      },
      (messageId) => {
        finalizeMainMessage({
          id: messageId,
          conversation_id: activeConversationId,
          role: "assistant",
          content: accumulated,
          message_index: mainMessages.length + 1,
          created_at: new Date().toISOString(),
        });
        setMessageBranches((prev) => ({ ...prev, [messageId]: [] }));
      },
      (err) => {
        console.error("main stream error:", err);
        setIsMainStreaming(false);
      },
    );
  }

  async function handleCreateBranch(intent: BranchIntent) {
    if (!selectedMainText || !activeConversationId) return;
    const question = INTENT_QUESTIONS[intent](selectedMainText.text);
    const res = await createBranch({
      conversationId: activeConversationId,
      sourceMessageId: selectedMainText.messageId,
      selectedText: selectedMainText.text,
      selectionRange: {
        startOffset: selectedMainText.startOffset,
        endOffset: selectedMainText.endOffset,
      },
      initialQuestion: question,
      intent,
    });

    const branchId = res.branch_thread_id;
    const capturedQuestion = question;

    // Load branch metadata
    const branchData = await getBranch(branchId);
    setBranch(branchData);

    // Seed branch messages with user message
    setBranchMessages(branchId, [
      {
        id: `tmp-user-${branchId}`,
        branch_thread_id: branchId,
        role: "user",
        content: capturedQuestion,
        created_at: new Date().toISOString(),
      },
    ]);

    openBranchTab(branchId);

    // Refresh source message branch list
    const msgId = selectedMainText.messageId;
    getMessageBranches(msgId).then((r) => {
      setMessageBranches((prev) => ({
        ...prev,
        [msgId]: r.branches as BranchListItem[],
      }));
    });

    // Stream assistant response
    const { setStreamingBranchContent, setIsBranchStreaming, finalizeBranchMessage } =
      useChatStore.getState();
    setIsBranchStreaming(branchId, true);
    let accumulated = "";

    createSSEStream(
      res.stream_url,
      (chunk) => {
        accumulated += chunk;
        setStreamingBranchContent(branchId, accumulated);
      },
      (messageId) => {
        finalizeBranchMessage(branchId, {
          id: messageId,
          branch_thread_id: branchId,
          role: "assistant",
          content: accumulated,
          created_at: new Date().toISOString(),
        });
      },
      (err) => {
        console.error("branch create stream error:", err);
        setIsBranchStreaming(branchId, false);
      },
    );

    setSelectedMainText(null);
  }

  const referencedBranchObjects = referencedBranchIds
    .map((id) => branches[id])
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-4">+</div>
          <div>选择或创建一个对话开始</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {selectedMainText && (
        <SelectionToolbar
          selection={selectedMainText}
          onCreateBranch={handleCreateBranch}
          onClose={() => setSelectedMainText(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mainMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            开始对话吧
          </div>
        )}

        {mainMessages.map((msg) => (
          <MainMessageItem
            key={msg.id}
            message={msg}
            branches={messageBranches[msg.id] ?? []}
            onOpenBranch={openBranchTab}
          />
        ))}

        {isMainStreaming && streamingMainContent && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-gray-200 text-gray-800">
              <MessageContent content={streamingMainContent} />
              <span className="animate-pulse text-gray-400">|</span>
            </div>
          </div>
        )}

        {isMainStreaming && !streamingMainContent && (
          <div className="flex justify-start mb-4">
            <div className="rounded-2xl px-4 py-3 bg-white border border-gray-200">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MainComposer
        referencedBranches={referencedBranchObjects}
        onSend={handleSend}
        onRemoveReference={removeReferencedBranch}
        disabled={isMainStreaming}
      />
    </div>
  );
}
