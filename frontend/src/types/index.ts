export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  branch_count?: number;
}

export interface MainMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  message_index: number;
  metadata_?: Record<string, unknown>;
  created_at: string;
}

export type BranchStatus = "active" | "collapsed" | "saved" | "merged" | "archived";

export interface BranchThread {
  id: string;
  conversation_id: string;
  source_message_id: string;
  source_message_index: number;
  selected_text?: string;
  selection_range?: { start_offset: number; end_offset: number };
  source_snapshot: {
    messageContent: string;
    conversationTitle?: string;
    mainTopicSummary?: string;
  };
  title: string;
  status: BranchStatus;
  summary?: string;
  summary_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BranchMessage {
  id: string;
  branch_thread_id: string;
  role: "user" | "assistant";
  content: string;
  metadata_?: Record<string, unknown>;
  created_at: string;
}

export interface BranchListItem {
  id: string;
  title: string;
  status: BranchStatus;
  summary?: string;
  source_message_id: string;
  selected_text?: string;
  created_at: string;
  updated_at: string;
}

export type BranchIntent = "explain" | "background" | "derive" | "search" | "custom";

export interface SelectedMainText {
  messageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}
