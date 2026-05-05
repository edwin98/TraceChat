import { useEffect, useRef, useState } from "react";
import type { BranchThread } from "../types";

interface Props {
  referencedBranches: BranchThread[];
  onSend: (content: string) => void;
  onRemoveReference: (id: string) => void;
  onClearReferences: () => void;
  disabled?: boolean;
}

export function MainComposer({
  referencedBranches,
  onSend,
  onRemoveReference,
  onClearReferences,
  disabled,
}: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  function handleSend() {
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {referencedBranches.length > 0 && (
        <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-blue-700">
              已引用 {referencedBranches.length} 个支线摘要
            </span>
            <button
              onClick={onClearReferences}
              className="rounded-md px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100"
            >
              清空
            </button>
          </div>
          <div className="space-y-1.5">
            {referencedBranches.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs text-blue-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{b.title}</span>
                  <button
                    onClick={() => onRemoveReference(b.id)}
                    className="flex-shrink-0 rounded px-1 text-blue-500 hover:bg-blue-50 hover:text-blue-800"
                  >
                    移除
                  </button>
                </div>
                <div className="mt-1 line-clamp-2 text-blue-700/80">{b.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="发送消息（Enter 发送，Shift+Enter 换行）"
          rows={1}
          className="flex-1 resize-none overflow-y-auto rounded-xl border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ minHeight: "40px", maxHeight: "160px" }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !trimmed}
          title={disabled ? "正在生成回复" : !trimmed ? "请输入消息" : "发送"}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {disabled ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
