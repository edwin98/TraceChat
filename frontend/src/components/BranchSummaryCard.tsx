import { useEffect, useState } from "react";
import type { BranchThread } from "../types";

interface Props {
  branch: BranchThread;
  onSummarize: () => Promise<void>;
  onMerge: (summary: string) => Promise<void>;
  onReferenceToInput: (branch: BranchThread) => void;
}

export function BranchSummaryCard({ branch, onSummarize, onMerge, onReferenceToInput }: Props) {
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [editedSummary, setEditedSummary] = useState(branch.summary ?? "");

  useEffect(() => {
    if (branch.summary) setEditedSummary(branch.summary);
  }, [branch.summary]);

  async function handleSummarize() {
    setLoading(true);
    try {
      await onSummarize();
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!editedSummary.trim()) return;
    setMerging(true);
    try {
      await onMerge(editedSummary.trim());
    } finally {
      setMerging(false);
    }
  }

  const hasSummary = Boolean(branch.summary || editedSummary);

  return (
    <div className="border-t border-gray-100 pt-3 space-y-2">
      {hasSummary ? (
        <>
          <div className="text-xs font-medium text-gray-600 flex items-center justify-between">
            <span>摘要</span>
            {branch.status !== "merged" && (
              <button
                onClick={handleSummarize}
                disabled={loading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {loading ? "生成中..." : "重新生成"}
              </button>
            )}
          </div>
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            disabled={branch.status === "merged"}
            rows={4}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </>
      ) : (
        <div className="space-y-1.5">
          <button
            onClick={handleSummarize}
            disabled={loading}
            className="w-full py-2 text-sm border border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {loading ? "生成摘要中..." : "生成摘要"}
          </button>
          <div className="text-center text-[11px] text-gray-400">
            生成摘要后才可引用到主线，避免把完整支线误带入主线。
          </div>
        </div>
      )}

      {hasSummary && branch.status !== "merged" && (
        <div className="flex gap-2">
          <button
            onClick={handleMerge}
            disabled={merging || !editedSummary.trim()}
            className="flex-1 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {merging ? "回填中..." : "回填主线"}
          </button>
          <button
            onClick={() => onReferenceToInput(branch)}
            className="flex-1 py-1.5 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            引用到输入框
          </button>
        </div>
      )}

      {branch.status === "merged" && (
        <div className="text-xs text-purple-600 text-center py-1 bg-purple-50 rounded-lg">
          已回填主线
        </div>
      )}
    </div>
  );
}
