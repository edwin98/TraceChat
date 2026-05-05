import { useEffect, useMemo, useState } from "react";
import { bulkUpdateBranchStatuses, getBranch } from "../api/branches";
import { getConversationBranches } from "../api/conversations";
import { useChatStore } from "../store/chatStore";
import type { BranchListItem, BranchStatus } from "../types";

type SortMode = "updated_desc" | "created_desc" | "title_asc";
type SummaryFilter = "all" | "with_summary" | "without_summary";

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
  const cachedBranches = useChatStore((s) => s.branches);
  const setBranch = useChatStore((s) => s.setBranch);
  const openBranchTab = useChatStore((s) => s.openBranchTab);
  const focusMainMessage = useChatStore((s) => s.focusMainMessage);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"all" | BranchStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeConversationId) {
      setBranches([]);
      setSelectedBranchIds([]);
      return;
    }
    setSelectedBranchIds([]);
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

  function toggleSelected(branchId: string) {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId],
    );
  }

  async function handleBulkStatus(status: BranchStatus) {
    if (!selectedBranchIds.length) return;
    const res = await bulkUpdateBranchStatuses(selectedBranchIds, status);
    const updatedIds = new Set(res.branches.map((branch) => branch.id));
    setBranches((prev) =>
      prev.map((branch) =>
        updatedIds.has(branch.id) ? { ...branch, status } : branch,
      ),
    );
    for (const item of res.branches) {
      const cached = cachedBranches[item.id];
      if (cached) setBranch({ ...cached, status: item.status });
    }
    setSelectedBranchIds([]);
  }

  const filteredBranches = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const result = branches.filter((branch) => {
      if (status !== "all" && branch.status !== status) return false;
      if (summaryFilter === "with_summary" && !branch.summary) return false;
      if (summaryFilter === "without_summary" && branch.summary) return false;
      if (!keyword) return true;
      const haystack = [
        branch.title,
        branch.summary ?? "",
        branch.selected_text ?? "",
      ].join("\n").toLowerCase();
      return haystack.includes(keyword);
    });
    return [...result].sort((a, b) => {
      if (sortMode === "created_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortMode === "title_asc") {
        return a.title.localeCompare(b.title, "zh-CN");
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [branches, query, status, summaryFilter, sortMode]);

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

  const visibleSelectedCount = filteredBranches.filter((branch) =>
    selectedBranchIds.includes(branch.id),
  ).length;

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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="updated_desc">最近更新</option>
            <option value="created_desc">最近创建</option>
            <option value="title_asc">标题 A-Z</option>
          </select>
          <select
            value={summaryFilter}
            onChange={(e) => setSummaryFilter(e.target.value as SummaryFilter)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">全部摘要</option>
            <option value="with_summary">有摘要</option>
            <option value="without_summary">无摘要</option>
          </select>
        </div>
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
        {selectedBranchIds.length > 0 && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600">
                已选 {selectedBranchIds.length} 个支线
                {visibleSelectedCount !== selectedBranchIds.length
                  ? `（当前视图 ${visibleSelectedCount} 个）`
                  : ""}
              </span>
              <button
                onClick={() => setSelectedBranchIds([])}
                className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-white"
              >
                取消
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handleBulkStatus("saved")}
                className="rounded-md border border-green-200 bg-white px-1.5 py-1 text-xs text-green-700 hover:bg-green-50"
              >
                保存
              </button>
              <button
                onClick={() => handleBulkStatus("collapsed")}
                className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                折叠
              </button>
              <button
                onClick={() => handleBulkStatus("archived")}
                className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                归档
              </button>
            </div>
          </div>
        )}
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
            <div
              key={branch.id}
              onClick={() => handleOpenBranch(branch.id)}
              className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <input
                  type="checkbox"
                  checked={selectedBranchIds.includes(branch.id)}
                  onChange={() => toggleSelected(branch.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-gray-300"
                  title="选择支线"
                />
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
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-400">
                <span>更新于 {new Date(branch.updated_at).toLocaleString("zh-CN")}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    focusMainMessage(branch.source_message_id);
                  }}
                  className="flex-shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-gray-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                >
                  来源
                </button>
              </div>
            </div>
          ))}
      </div>
    </aside>
  );
}
