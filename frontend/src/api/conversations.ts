import { api } from "./client";
import type { BranchListItem, Conversation, MainMessage } from "../types";

export async function createConversation(title = "新对话"): Promise<Conversation> {
  const res = await api.post("/api/conversations", { title });
  return res.data;
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await api.get("/api/conversations");
  return res.data;
}

export async function getMessages(conversationId: string): Promise<MainMessage[]> {
  const res = await api.get(`/api/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendMainMessage(
  conversationId: string,
  content: string,
  referencedBranchIds: string[] = [],
) {
  const res = await api.post(`/api/conversations/${conversationId}/messages`, {
    content,
    referenced_branch_ids: referencedBranchIds,
  });
  return res.data as { user_message_id: string; assistant_message_id: string; stream_url: string };
}

export async function getConversationBranches(
  conversationId: string,
  sourceMessageId?: string,
): Promise<{ branches: BranchListItem[] }> {
  const params: Record<string, string> = {};
  if (sourceMessageId) params.source_message_id = sourceMessageId;
  const res = await api.get(`/api/conversations/${conversationId}/branches`, { params });
  return res.data;
}
