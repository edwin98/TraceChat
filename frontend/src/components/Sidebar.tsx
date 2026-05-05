import { useEffect, useMemo, useState } from "react";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  recentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => Promise<void>;
}

export function Sidebar({
  conversations,
  activeId,
  recentId,
  onSelect,
  onCreate,
  onRename,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!editingId) return;
    const conv = conversations.find((item) => item.id === editingId);
    if (conv) setDraftTitle(conv.title);
  }, [conversations, editingId]);

  async function submitRename(id: string) {
    const title = draftTitle.trim();
    if (!title) return;
    setSavingId(id);
    try {
      await onRename(id, title);
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  const filteredConversations = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = keyword
      ? conversations.filter((conv) => conv.title.toLowerCase().includes(keyword))
      : conversations;
    if (!recentId) return filtered;
    const recent = filtered.find((conv) => conv.id === recentId);
    if (!recent) return filtered;
    return [recent, ...filtered.filter((conv) => conv.id !== recentId)];
  }, [conversations, query, recentId]);

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full flex-shrink-0">
      <div className="px-4 py-4 border-b border-gray-700">
        <h1 className="font-bold text-lg tracking-tight">TraceChat</h1>
        <p className="text-xs text-gray-400 mt-0.5">主线 + 支线查询</p>
      </div>

      <div className="px-3 py-2">
        <button
          onClick={onCreate}
          className="w-full py-2 px-3 text-sm border border-dashed border-gray-600 rounded-xl hover:border-gray-400 hover:bg-gray-800 transition-colors text-gray-300"
        >
          + 新对话
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索会话"
          className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white outline-none placeholder:text-gray-500 focus:border-blue-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {filteredConversations.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-500">
            没有匹配会话
          </div>
        )}

        {filteredConversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
              conv.id === activeId
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {editingId === conv.id ? (
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitRename(conv.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => void submitRename(conv.id)}
                  disabled={savingId === conv.id}
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none"
                />
              ) : (
                <div className="min-w-0 flex-1 truncate">{conv.title}</div>
              )}
              {editingId !== conv.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(conv.id);
                    setDraftTitle(conv.title);
                  }}
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-700 hover:text-white"
                  title="重命名会话"
                >
                  编辑
                </button>
              )}
            </div>
            <div className="text-xs opacity-60 mt-0.5">
              <span>{new Date(conv.updated_at).toLocaleDateString("zh-CN")}</span>
              <span className="mx-1">·</span>
              <span>{conv.message_count ?? 0} 消息</span>
              <span className="mx-1">·</span>
              <span>{conv.branch_count ?? 0} 支线</span>
              {conv.id === recentId && (
                <span className="ml-1 rounded bg-gray-700 px-1 py-0.5 text-[10px] text-gray-300">
                  最近
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
