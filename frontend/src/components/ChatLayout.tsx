import { useEffect, useState } from "react";
import { useChatStore } from "../store/chatStore";
import {
  createConversation,
  getMessages,
  listConversations,
  updateConversationTitle,
} from "../api/conversations";
import { getApiKeyStatus, getSettings } from "../api/settings";
import type { Conversation } from "../types";
import { Sidebar } from "./Sidebar";
import { MainThread } from "./MainThread";
import { BranchPanel } from "./BranchPanel";
import { BranchLibrary } from "./BranchLibrary";
import { SettingsModal } from "./SettingsModal";

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recentConversationId, setRecentConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [modelNames, setModelNames] = useState<{ main: string; branch: string }>({
    main: "",
    branch: "",
  });
  const {
    activeConversationId,
    branchPanelOpen,
    setActiveConversation,
    setMainMessages,
  } = useChatStore();

  useEffect(() => {
    loadConversations();
    loadSettingsMeta();
  }, []);

  async function loadSettingsMeta() {
    const [s, k] = await Promise.all([getSettings(), getApiKeyStatus()]);
    const configured = Object.entries(k)
      .filter(([, v]) => v)
      .map(([p]) => {
        const map: Record<string, string> = {
          anthropic: "Anthropic",
          openai: "OpenAI",
          gemini: "Google",
          openrouter: "OpenRouter",
        };
        return map[p] ?? p;
      });
    setActiveProviders(configured);

    const shortName = (id: string) => {
      const known: Record<string, string> = {
        "claude-opus-4-7": "Opus 4.7",
        "claude-sonnet-4-6": "Sonnet 4.6",
        "claude-haiku-4-5-20251001": "Haiku 4.5",
        "gpt-4o": "GPT-4o",
        "gpt-4o-mini": "GPT-4o Mini",
        "gemini/gemini-2.0-flash": "Gemini Flash",
        "gemini/gemini-2.5-pro": "Gemini 2.5 Pro",
      };
      return known[id] ?? id.split("/").pop() ?? id;
    };
    setModelNames({ main: shortName(s.main_model), branch: shortName(s.branch_model) });
  }

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
    setConversations((prev) => prev.map((conv) => (conv.id === id ? updated : conv)));
  }

  const noApiKey = activeProviders.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        recentId={recentConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleCreateConversation}
        onRename={handleRenameConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          {/* API Key warning */}
          {noApiKey ? (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              未配置 API Key，点击设置
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-gray-600">
                主：{modelNames.main}
              </span>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-gray-600">
                支：{modelNames.branch}
              </span>
            </div>
          )}

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="设置"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <MainThread onOpenSettings={() => setSettingsOpen(true)} noApiKey={noApiKey} />
          </div>

          {branchPanelOpen && (
            <div className="flex w-[380px] flex-shrink-0 flex-col border-l border-gray-200">
              <BranchPanel />
            </div>
          )}

          <BranchLibrary />
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            setSettingsOpen(false);
            loadSettingsMeta();
          }}
          onProvidersChange={(providers) => setActiveProviders(providers)}
        />
      )}
    </div>
  );
}
