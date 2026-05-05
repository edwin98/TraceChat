import type { BranchThread } from "../types";

interface Props {
  branch: BranchThread;
  onOpenSource?: (messageId: string) => void;
}

export function BranchSourceCard({ branch, onOpenSource }: Props) {
  const snap = branch.source_snapshot;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-amber-900">来源信息</div>
        {onOpenSource && (
          <button
            onClick={() => onOpenSource(branch.source_message_id)}
            className="rounded-md border border-amber-300 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-100"
          >
            打开来源
          </button>
        )}
      </div>
      {branch.selected_text && (
        <div>
          <span className="text-amber-600">选中文本：</span>
          <span className="bg-amber-100 px-1 rounded font-mono">"{branch.selected_text}"</span>
        </div>
      )}
      {snap.conversationTitle && (
        <div>
          <span className="text-amber-600">所属对话：</span>
          {snap.conversationTitle}
        </div>
      )}
      {snap.mainTopicSummary && (
        <div>
          <span className="text-amber-600">主线摘要：</span>
          {snap.mainTopicSummary.slice(0, 100)}…
        </div>
      )}
    </div>
  );
}
