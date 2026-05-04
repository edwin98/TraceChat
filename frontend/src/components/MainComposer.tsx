import { useState } from "react";
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
  const trimmed = text.trim();
  const disabledReason = disabled
    ? "正在生成回复，请等待当前回复完成"
    : !trimmed
      ? "请输入消息内容"
      : "";

  function handleSend() {
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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
                <div className="mt-1 line-clamp-2 text-blue-700/80">
                  {b.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Ctrl+Enter 发送..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !trimmed}
          title={disabledReason}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors self-end"
        >
          {disabled ? "生成中" : "发送"}
        </button>
      </div>
      {disabledReason && (
        <div className="mt-1 text-right text-[11px] text-gray-400">{disabledReason}</div>
      )}
    </div>
  );
}
