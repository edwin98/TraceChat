import { useEffect, useRef } from "react";
import type { BranchIntent, BranchThread } from "../types";
import { useChatStore } from "../store/chatStore";
import { createSSEStream } from "../api/client";
import {
  getBranch,
  getBranchMessages,
  mergeBranch,
  sendBranchMessage,
  summarizeBranch,
  updateBranchStatus,
} from "../api/branches";
import { BranchSourceCard } from "./BranchSourceCard";
import { BranchSummaryCard } from "./BranchSummaryCard";
import { BranchComposer } from "./BranchComposer";
import { MessageContent } from "./MessageContent";
import { CopyButton } from "./CopyButton";

const STATUS_LABELS: Record<string, string> = {
  active: "活跃",
  collapsed: "已折叠",
  saved: "已保存",
  merged: "已回填",
  archived: "已归档",
};

const TAB_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-400",
  collapsed: "bg-gray-400",
  saved: "bg-green-400",
  merged: "bg-purple-400",
  archived: "bg-gray-300",
};

export function BranchPanel() {
  const {
    activeBranchId,
    openBranchIds,
    branches,
    branchMessages,
    streamingBranchContent,
    isBranchStreaming,
    setActiveBranchId,
    setBranchPanelOpen,
    setBranch,
    setBranchMessages,
    addBranchMessage,
    setStreamingBranchContent,
    setIsBranchStreaming,
    finalizeBranchMessage,
    closeBranchTab,
    openBranchTab,
    addReferencedBranch,
    focusMainMessage,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeBranch = activeBranchId ? branches[activeBranchId] : null;
  const activeMessages = activeBranchId ? (branchMessages[activeBranchId] ?? []) : [];
  const streamingContent = activeBranchId ? (streamingBranchContent[activeBranchId] ?? "") : "";
  const isStreaming = activeBranchId ? (isBranchStreaming[activeBranchId] ?? false) : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, streamingContent]);

  useEffect(() => {
    if (!activeBranchId) return;
    const hasMessages = branchMessages[activeBranchId] !== undefined;
    if (branches[activeBranchId] && hasMessages) return;
    loadBranch(activeBranchId);
  }, [activeBranchId]);

  async function loadBranch(branchId: string) {
    const [branch, msgs] = await Promise.all([
      getBranch(branchId),
      getBranchMessages(branchId),
    ]);
    setBranch(branch);
    setBranchMessages(branchId, msgs);
  }

  async function handleSend(content: string) {
    if (!activeBranchId || isStreaming) return;
    const res = await sendBranchMessage(activeBranchId, content);
    const branchId = activeBranchId;

    addBranchMessage({
      id: res.user_message_id,
      branch_thread_id: branchId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    });

    setIsBranchStreaming(branchId, true);
    setStreamingBranchContent(branchId, "");

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
        console.error("branch stream error:", err);
        setIsBranchStreaming(branchId, false);
      },
    );
  }

  async function handleSummarize() {
    if (!activeBranchId) return;
    const res = await summarizeBranch(activeBranchId);
    const updated = await getBranch(activeBranchId);
    setBranch({ ...updated, summary: res.summary });
  }

  async function handleMerge(summary: string) {
    if (!activeBranchId) return;
    await mergeBranch(activeBranchId, summary);
    const updated = await getBranch(activeBranchId);
    setBranch(updated);
  }

  async function handleStatusChange(status: string) {
    if (!activeBranchId) return;
    await updateBranchStatus(activeBranchId, status);
    const updated = await getBranch(activeBranchId);
    setBranch(updated);
  }

  function handleReferenceToInput(branch: BranchThread) {
    if (!branch.summary?.trim()) {
      window.alert("请先生成支线摘要，再引用到主线输入框。");
      return;
    }
    addReferencedBranch(branch.id);
  }

  if (openBranchIds.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0">
        {openBranchIds.map((id) => {
          const b = branches[id];
          const isActive = id === activeBranchId;
          return (
            <div
              key={id}
              className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-gray-100 flex-shrink-0 max-w-[140px] ${
                isActive ? "bg-amber-50 border-b-2 border-b-amber-500" : "hover:bg-gray-50"
              }`}
              onClick={() => openBranchTab(id)}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  TAB_STATUS_COLORS[b?.status ?? "active"] ?? "bg-gray-400"
                }`}
              />
              <span className="text-xs text-gray-700 truncate">
                {b?.title ?? "加载中..."}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeBranchTab(id);
                }}
                className="text-gray-400 hover:text-gray-600 ml-0.5 flex-shrink-0"
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          onClick={() => setBranchPanelOpen(false)}
          className="ml-auto px-3 py-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          title="关闭面板"
        >
          ×
        </button>
      </div>

      {activeBranch && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                {activeBranch.title}
              </h3>
              <select
                value={activeBranch.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 bg-white flex-shrink-0"
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source card */}
          <div className="px-3 pt-3 flex-shrink-0">
            <BranchSourceCard branch={activeBranch} onOpenSource={focusMainMessage} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-amber-500 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  <MessageContent content={msg.content} />
                  <div className={`mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                    <CopyButton
                      text={msg.content}
                      className={
                        msg.role === "user"
                          ? "text-white/70 hover:bg-white/10 hover:text-white"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl px-3 py-2.5 bg-white border border-gray-200 text-gray-800 text-sm">
                  <MessageContent content={streamingContent} />
                  <span className="animate-pulse text-gray-400">|</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Summary + actions */}
          <div className="px-3 pb-3 flex-shrink-0">
            <BranchSummaryCard
              branch={activeBranch}
              onSummarize={handleSummarize}
              onMerge={handleMerge}
              onReferenceToInput={handleReferenceToInput}
            />
          </div>

          {/* Composer */}
          {activeBranch.status !== "archived" && (
            <BranchComposer onSend={handleSend} disabled={isStreaming} />
          )}
        </div>
      )}
    </div>
  );
}
