import { useState } from "react";
import type { BranchThread } from "../types";

interface Props {
  referencedBranches: BranchThread[];
  onSend: (content: string) => void;
  onRemoveReference: (id: string) => void;
  disabled?: boolean;
}

export function MainComposer({ referencedBranches, onSend, onRemoveReference, disabled }: Props) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {referencedBranches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs text-gray-500 self-center">已引用：</span>
          {referencedBranches.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5"
            >
              {b.title}
              <button
                onClick={() => onRemoveReference(b.id)}
                className="hover:text-blue-900 ml-0.5 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors self-end"
        >
          发送
        </button>
      </div>
    </div>
  );
}
