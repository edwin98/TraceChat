import { useState } from "react";
import type { BranchListItem, MainMessage } from "../types";
import { MessageContent } from "./MessageContent";

interface Props {
  message: MainMessage;
  branches: BranchListItem[];
  onOpenBranch: (branchId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  collapsed: "bg-gray-100 text-gray-600",
  saved: "bg-green-100 text-green-700",
  merged: "bg-purple-100 text-purple-700",
  archived: "bg-gray-50 text-gray-400",
};

export function MainMessageItem({ message, branches, onOpenBranch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";
  const visibleBranches = branches.filter((b) => b.status !== "archived");

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      data-message-id={message.id}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          <MessageContent content={message.content} />
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
