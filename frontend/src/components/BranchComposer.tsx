import { useState } from "react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function BranchComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
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
    <div className="border-t border-gray-200 px-3 py-2 bg-white">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="继续追问，Ctrl+Enter 发送..."
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="px-3 py-2 bg-amber-500 text-white rounded-xl text-sm hover:bg-amber-600 disabled:opacity-40 transition-colors self-end"
        >
          发送
        </button>
      </div>
    </div>
  );
}
