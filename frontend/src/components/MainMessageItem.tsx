import { useState } from "react";
import type { BranchListItem, MainMessage } from "../types";
import { CopyButton } from "./CopyButton";

interface Props {
  message: MainMessage;
  branches: BranchListItem[];
  onOpenBranch: (branchId: string) => void;
  highlighted?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  collapsed: "bg-gray-100 text-gray-600",
  saved: "bg-green-100 text-green-700",
  merged: "bg-purple-100 text-purple-700",
  archived: "bg-gray-50 text-gray-400",
};

const HIGHLIGHT_STYLES: Record<string, string> = {
  active: "bg-blue-100 underline decoration-blue-500 cursor-pointer",
  saved: "bg-green-100 underline decoration-green-500 cursor-pointer",
  merged: "bg-purple-100 underline decoration-purple-500 cursor-pointer",
  collapsed: "underline decoration-gray-400 cursor-pointer",
  archived: "",
};

function renderHighlightedContent(
  content: string,
  branches: BranchListItem[],
  onOpenBranch: (id: string) => void,
) {
  const activeBranches = branches.filter(
    (b) => b.status !== "archived" && b.selected_text,
  );

  if (!activeBranches.length) {
    return <span>{content}</span>;
  }

  // Build segments with highlights
  const segments: Array<{ text: string; branch?: BranchListItem }> = [];
  let remaining = content;
  let offset = 0;

  // Find all highlighted regions, sorted by position in text
  const regions: Array<{ start: number; end: number; branch: BranchListItem }> = [];
  for (const branch of activeBranches) {
    if (!branch.selected_text) continue;
    const idx = content.indexOf(branch.selected_text, offset);
    if (idx !== -1) {
      regions.push({ start: idx, end: idx + branch.selected_text.length, branch });
    }
  }
  regions.sort((a, b) => a.start - b.start);

  let pos = 0;
  for (const region of regions) {
    if (pos < region.start) {
      segments.push({ text: content.slice(pos, region.start) });
    }
    if (region.start >= pos) {
      segments.push({ text: content.slice(region.start, region.end), branch: region.branch });
      pos = region.end;
    }
  }
  if (pos < content.length) {
    segments.push({ text: content.slice(pos) });
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.branch ? (
          <mark
            key={i}
            onClick={() => onOpenBranch(seg.branch!.id)}
            title={seg.branch.title}
            className={`${HIGHLIGHT_STYLES[seg.branch.status] ?? ""} rounded px-0.5`}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

export function MainMessageItem({ message, branches, onOpenBranch, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";
  const visibleBranches = branches.filter((b) => b.status !== "archived");

  return (
    <div
      id={`main-message-${message.id}`}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 rounded-2xl transition-shadow duration-300 ${
        highlighted ? "ring-2 ring-amber-300 ring-offset-2" : ""
      }`}
      data-message-id={message.id}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          {isUser || visibleBranches.length === 0
            ? message.content
            : renderHighlightedContent(message.content, visibleBranches, onOpenBranch)}
        </div>

        <div className={`mt-1 ${isUser ? "self-end" : "self-start"}`}>
          <CopyButton
            text={message.content}
            className={
              isUser
                ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }
          />
        </div>

        {visibleBranches.length > 0 && (
          <div className="mt-1.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
            >
              <span>↳ {visibleBranches.length} 个支线</span>
              <span>{expanded ? "▲" : "▼"}</span>
            </button>

            {expanded && (
              <div className="mt-1 bg-white border border-gray-100 rounded-xl p-2 shadow-sm min-w-[220px]">
                {visibleBranches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onOpenBranch(b.id)}
                    className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 gap-2"
                  >
                    <span className="text-xs text-gray-700 truncate flex-1">{b.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
