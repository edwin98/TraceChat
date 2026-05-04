import type { BranchThread } from "../types";

interface Props {
  branch: BranchThread;
}

export function BranchSourceCard({ branch }: Props) {
  const snap = branch.source_snapshot;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
      <div className="font-medium text-amber-900">来源信息</div>
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
