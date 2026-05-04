import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onCreate }: Props) {
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
              conv.id === activeId
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <div className="truncate">{conv.title}</div>
            <div className="text-xs opacity-60 mt-0.5">
              {new Date(conv.updated_at).toLocaleDateString("zh-CN")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
