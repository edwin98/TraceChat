import { useEffect, useState } from "react";
import { useChatStore } from "../store/chatStore";
import {
  createConversation,
  getMessages,
  listConversations,
  updateConversationTitle,
} from "../api/conversations";
import type { Conversation } from "../types";
import { Sidebar } from "./Sidebar";
import { MainThread } from "./MainThread";
import { BranchPanel } from "./BranchPanel";
import { ModelSelector } from "./ModelSelector";
import { BranchLibrary } from "./BranchLibrary";

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recentConversationId, setRecentConversationId] = useState<string | null>(null);
  const {
    activeConversationId,
    branchPanelOpen,
    setActiveConversation,
    setMainMessages,
  } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const list = await listConversations();
    setConversations(list);
    if (!activeConversationId && list.length > 0) {
      const latest = list[0];
      setRecentConversationId(latest.id);
      setActiveConversation(latest.id);
      const msgs = await getMessages(latest.id);
      setMainMessages(msgs);
    }
  }

  async function handleSelectConversation(id: string) {
    setRecentConversationId(id);
    setActiveConversation(id);
    const msgs = await getMessages(id);
    setMainMessages(msgs);
  }

  async function handleCreateConversation() {
    const conv = await createConversation("新对话");
    setConversations((prev) => [conv, ...prev]);
    setRecentConversationId(conv.id);
    setActiveConversation(conv.id);
    setMainMessages([]);
  }

  async function handleRenameConversation(id: string, title: string) {
    const updated = await updateConversationTitle(id, title);
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? updated : conv)),
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        recentId={recentConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleCreateConversation}
        onRename={handleRenameConversation}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar with model selector */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <ModelSelector />
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-w-0">
            <MainThread />
          </div>

          {branchPanelOpen && (
            <div className="w-[380px] flex-shrink-0 flex flex-col border-l border-gray-200">
              <BranchPanel />
            </div>
          )}

          <BranchLibrary />
        </div>
      </div>
    </div>
  );
}
