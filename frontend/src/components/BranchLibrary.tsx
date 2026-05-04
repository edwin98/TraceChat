import { useEffect, useMemo, useState } from "react";
import { getBranch } from "../api/branches";
import { getConversationBranches } from "../api/conversations";
import { useChatStore } from "../store/chatStore";
import type { BranchListItem, BranchStatus } from "../types";

const STATUS_OPTIONS: Array<{ value: "all" | BranchStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "活跃" },
  { value: "saved", label: "已保存" },
  { value: "merged", label: "已回填" },
  { value: "collapsed", label: "已折叠" },
  { value: "archived", label: "归档" },
];

const STATUS_LABELS: Record<BranchStatus, string> = {
  active: "活跃",
  collapsed: "折叠",
  saved: "保存",
  merged: "回填",
  archived: "归档",
};

const STATUS_STYLES: Record<BranchStatus, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-100",
  collapsed: "bg-gray-50 text-gray-600 border-gray-100",
  saved: "bg-green-50 text-green-700 border-green-100",
  merged: "bg-purple-50 text-purple-700 border-purple-100",
  archived: "bg-gray-50 text-gray-400 border-gray-100",
};

export function BranchLibrary() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setBranch = useChatStore((s) => s.setBranch);
  const openBranchTab = useChatStore((s) => s.openBranchTab);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [status, setStatus] = useState<"all" | BranchStatus>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeConversationId) {
      setBranches([]);
      return;
    }
    void loadBranches();
  }, [activeConversationId]);

  async function loadBranches() {
    if (!activeConversationId) return;
    setLoading(true);
    try {
      const res = await getConversationBranches(activeConversationId);
      setBranches(res.branches);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenBranch(branchId: string) {
    const branch = await getBranch(branchId);
    setBranch(branch);
    openBranchTab(branchId);
  }

  const filteredBranches = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return branches.filter((branch) => {
      if (status !== "all" && branch.status !== status) return false;
      if (!keyword) return true;
      const haystack = [
        branch.title,
        branch.summary ?? "",
        branch.selected_text ?? "",
      ].join("\n").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [branches, query, status]);

  const statusCounts = useMemo(() => {
    const counts: Record<"all" | BranchStatus, number> = {
      all: branches.length,
      active: 0,
      collapsed: 0,
      saved: 0,
      merged: 0,
      archived: 0,
    };
    for (const branch of branches) {
      counts[branch.status] += 1;
    }
    return counts;
  }, [branches]);

  if (!activeConversationId) return null;

  return (
    <aside className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">支线库</h2>
          <button
            onClick={loadBranches}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50"
            title="刷新支线库"
          >
            刷新
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题、摘要或选中文本"
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={`flex-shrink-0 rounded-lg border px-2 py-1 text-xs transition-colors ${
                status === option.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {option.label}
              <span className="ml-1 opacity-70">{statusCounts[option.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <div className="px-2 py-8 text-center text-xs text-gray-400">加载支线中...</div>
        )}

        {!loading && filteredBranches.length === 0 && (
          <div className="px-2 py-8 text-center text-xs text-gray-400">
            暂无匹配支线
          </div>
        )}

        {!loading &&
          filteredBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleOpenBranch(branch.id)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-800">
                    {branch.title}
                  </div>
                  {branch.selected_text && (
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {branch.selected_text}
                    </div>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] ${
                    STATUS_STYLES[branch.status]
                  }`}
                >
                  {STATUS_LABELS[branch.status]}
                </span>
              </div>
              {branch.summary && (
                <div className="mt-2 line-clamp-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
                  {branch.summary}
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-400">
                更新于 {new Date(branch.updated_at).toLocaleString("zh-CN")}
              </div>
            </button>
          ))}
      </div>
    </aside>
  );
}
