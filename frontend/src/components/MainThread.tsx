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

const FEATURE_CARDS = [
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
          clipRule="evenodd"
        />
        <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
      </svg>
    ),
    title: "主线对话",
    desc: "正式推进任务，上下文连续不中断",
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17z" />
        <path
          fillRule="evenodd"
          d="M0 4a2 2 0 012-2h12a2 2 0 012 2v3.382a5.506 5.506 0 00-2 0V4H2v10h5.764a5.506 5.506 0 000 2H2a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    title: "支线查询",
    desc: "选中文本一键创建，独立上下文不污染主线",
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zm0 4a1 1 0 000 2h5a1 1 0 000-2H3zm0 4a1 1 0 100 2h4a1 1 0 100-2H3zm10-4a1 1 0 10-2 0v7.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 14.586V7z"
          clipRule="evenodd"
        />
      </svg>
    ),
    title: "摘要回填",
    desc: "支线结论生成摘要，确认后注入主线上下文",
  },
];

interface Props {
  onOpenSettings?: () => void;
  noApiKey?: boolean;
}

export function MainThread({ onOpenSettings, noApiKey }: Props) {
  const {
    activeConversationId,
    mainMessages,
    streamingMainContent,
    isMainStreaming,
    selectedMainText,
    focusedMainMessageId,
    referencedBranchIds,
    branches,
    finalizeMainMessage,
    setStreamingMainContent,
    setIsMainStreaming,
    addMainMessage,
    setSelectedMainText,
    clearFocusedMainMessage,
    removeReferencedBranch,
    clearReferencedBranches,
    openBranchTab,
    setBranch,
    setBranchMessages,
  } = useChatStore();

  const [messageBranches, setMessageBranches] = useState<Record<string, BranchListItem[]>>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
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
    if (!focusedMainMessageId) return;
    const el = document.getElementById(`main-message-${focusedMainMessageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(focusedMainMessageId);
    const timer = window.setTimeout(() => {
      setHighlightedMessageId(null);
      clearFocusedMainMessage();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [focusedMainMessageId, mainMessages, clearFocusedMainMessage]);

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
        clearReferencedBranches();
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

    const branchData = await getBranch(branchId);
    setBranch(branchData);

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

    const msgId = selectedMainText.messageId;
    getMessageBranches(msgId).then((r) => {
      setMessageBranches((prev) => ({
        ...prev,
        [msgId]: r.branches as BranchListItem[],
      }));
    });

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

  // No conversation selected — welcome screen
  if (!activeConversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <svg className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                clipRule="evenodd"
              />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">TraceChat</h1>
          <p className="mt-1 text-sm text-gray-500">主线对话 + 支线查询，互不干扰</p>
        </div>

        <div className="mb-8 grid w-full max-w-md gap-3">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left"
            >
              <div className="mt-0.5 flex-shrink-0 text-blue-500">{card.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-800">{card.title}</p>
                <p className="text-xs text-gray-500">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {noApiKey ? (
          <button
            onClick={onOpenSettings}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            配置 API Key 开始使用
          </button>
        ) : (
          <p className="text-sm text-gray-400">在左侧创建新对话开始</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {selectedMainText && (
        <SelectionToolbar
          selection={selectedMainText}
          onCreateBranch={handleCreateBranch}
          onClose={() => setSelectedMainText(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mainMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">开始对话</p>
            <p className="mt-1 text-xs text-gray-400">
              发送消息后，选中 AI 回复中的文字可创建支线查询
            </p>
          </div>
        )}

        {mainMessages.map((msg) => (
          <MainMessageItem
            key={msg.id}
            message={msg}
            branches={messageBranches[msg.id] ?? []}
            onOpenBranch={openBranchTab}
            highlighted={highlightedMessageId === msg.id}
          />
        ))}

        {isMainStreaming && streamingMainContent && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-[80%] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-800">
              <MessageContent content={streamingMainContent} />
              <span className="animate-pulse text-gray-400">|</span>
            </div>
          </div>
        )}

        {isMainStreaming && !streamingMainContent && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
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
        onClearReferences={clearReferencedBranches}
        disabled={isMainStreaming}
      />
    </div>
  );
}
