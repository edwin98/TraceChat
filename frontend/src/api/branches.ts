import { api } from "./client";
import type { BranchIntent, BranchMessage, BranchStatus, BranchThread } from "../types";

export async function createBranch(params: {
  conversationId: string;
  sourceMessageId: string;
  selectedText?: string;
  selectionRange?: { startOffset: number; endOffset: number };
  initialQuestion: string;
  intent: BranchIntent;
}) {
  const res = await api.post("/api/branches", {
    conversation_id: params.conversationId,
    source_message_id: params.sourceMessageId,
    selected_text: params.selectedText,
    selection_range: params.selectionRange
      ? {
          start_offset: params.selectionRange.startOffset,
          end_offset: params.selectionRange.endOffset,
        }
      : undefined,
    initial_question: params.initialQuestion,
    intent: params.intent,
  });
  return res.data as { branch_thread_id: string; assistant_message_id: string; stream_url: string };
}

export async function getBranch(branchId: string): Promise<BranchThread> {
  const res = await api.get(`/api/branches/${branchId}`);
  return res.data;
}

export async function getBranchMessages(branchId: string): Promise<BranchMessage[]> {
  const res = await api.get(`/api/branches/${branchId}/messages`);
  return res.data;
}

export async function sendBranchMessage(branchId: string, content: string) {
  const res = await api.post(`/api/branches/${branchId}/messages`, { content });
  return res.data as { user_message_id: string; assistant_message_id: string; stream_url: string };
}

export async function summarizeBranch(branchId: string) {
  const res = await api.post(`/api/branches/${branchId}/summary`, {
    max_length: 200,
    style: "main_context",
  });
  return res.data as { summary: string };
}

export async function mergeBranch(branchId: string, summary: string) {
  const res = await api.post(`/api/branches/${branchId}/merge`, {
    summary,
    mode: "memory",
  });
  return res.data as { memory_id: string; branch_status: string };
}

export async function updateBranchStatus(branchId: string, status: string) {
  const res = await api.patch(`/api/branches/${branchId}/status`, { status });
  return res.data;
}

export async function bulkUpdateBranchStatuses(
  branchIds: string[],
  status: BranchStatus,
) {
  const res = await api.patch("/api/branches/status", {
    branch_ids: branchIds,
    status,
  });
  return res.data as {
    updated: number;
    branches: Array<{ id: string; status: BranchStatus }>;
  };
}

export async function getMessageBranches(messageId: string) {
  const res = await api.get(`/api/main-messages/${messageId}/branches`);
  return res.data as { branches: Array<{ id: string; title: string; status: string; summary?: string; selected_text?: string }> };
}
