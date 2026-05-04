import { create } from "zustand";
import type { BranchMessage, BranchThread, MainMessage, SelectedMainText } from "../types";

interface ChatStore {
  activeConversationId: string | null;
  activeBranchId: string | null;
  branchPanelOpen: boolean;
  openBranchIds: string[];

  mainMessages: MainMessage[];
  streamingMainContent: string;
  isMainStreaming: boolean;

  branches: Record<string, BranchThread>;
  branchMessages: Record<string, BranchMessage[]>;
  streamingBranchContent: Record<string, string>;
  isBranchStreaming: Record<string, boolean>;

  selectedMainText: SelectedMainText | null;
  referencedBranchIds: string[];

  setActiveConversation: (id: string) => void;
  setActiveBranchId: (id: string | null) => void;
  setBranchPanelOpen: (open: boolean) => void;

  setMainMessages: (msgs: MainMessage[]) => void;
  addMainMessage: (msg: MainMessage) => void;
  setStreamingMainContent: (content: string) => void;
  setIsMainStreaming: (v: boolean) => void;
  finalizeMainMessage: (msg: MainMessage) => void;

  setBranch: (branch: BranchThread) => void;
  setBranchMessages: (branchId: string, msgs: BranchMessage[]) => void;
  addBranchMessage: (msg: BranchMessage) => void;
  setStreamingBranchContent: (branchId: string, content: string) => void;
  setIsBranchStreaming: (branchId: string, v: boolean) => void;
  finalizeBranchMessage: (branchId: string, msg: BranchMessage) => void;

  openBranchTab: (branchId: string) => void;
  closeBranchTab: (branchId: string) => void;

  setSelectedMainText: (sel: SelectedMainText | null) => void;
  addReferencedBranch: (id: string) => void;
  removeReferencedBranch: (id: string) => void;
  clearReferencedBranches: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeConversationId: null,
  activeBranchId: null,
  branchPanelOpen: false,
  openBranchIds: [],

  mainMessages: [],
  streamingMainContent: "",
  isMainStreaming: false,

  branches: {},
  branchMessages: {},
  streamingBranchContent: {},
  isBranchStreaming: {},

  selectedMainText: null,
  referencedBranchIds: [],

  setActiveConversation: (id) =>
    set({
      activeConversationId: id,
      activeBranchId: null,
      branchPanelOpen: false,
      openBranchIds: [],
      mainMessages: [],
      branches: {},
      branchMessages: {},
      streamingBranchContent: {},
      isBranchStreaming: {},
      selectedMainText: null,
      referencedBranchIds: [],
    }),

  setActiveBranchId: (id) => set({ activeBranchId: id }),

  setBranchPanelOpen: (open) => set({ branchPanelOpen: open }),

  setMainMessages: (msgs) => set({ mainMessages: msgs }),

  addMainMessage: (msg) =>
    set((s) => ({ mainMessages: [...s.mainMessages, msg] })),

  setStreamingMainContent: (content) => set({ streamingMainContent: content }),

  setIsMainStreaming: (v) => set({ isMainStreaming: v }),

  finalizeMainMessage: (msg) =>
    set((s) => ({
      mainMessages: [...s.mainMessages, msg],
      streamingMainContent: "",
      isMainStreaming: false,
    })),

  setBranch: (branch) =>
    set((s) => ({ branches: { ...s.branches, [branch.id]: branch } })),

  setBranchMessages: (branchId, msgs) =>
    set((s) => ({ branchMessages: { ...s.branchMessages, [branchId]: msgs } })),

  addBranchMessage: (msg) =>
    set((s) => {
      const existing = s.branchMessages[msg.branch_thread_id] ?? [];
      return {
        branchMessages: {
          ...s.branchMessages,
          [msg.branch_thread_id]: [...existing, msg],
        },
      };
    }),

  setStreamingBranchContent: (branchId, content) =>
    set((s) => ({
      streamingBranchContent: { ...s.streamingBranchContent, [branchId]: content },
    })),

  setIsBranchStreaming: (branchId, v) =>
    set((s) => ({
      isBranchStreaming: { ...s.isBranchStreaming, [branchId]: v },
    })),

  finalizeBranchMessage: (branchId, msg) =>
    set((s) => {
      const existing = s.branchMessages[branchId] ?? [];
      return {
        branchMessages: { ...s.branchMessages, [branchId]: [...existing, msg] },
        streamingBranchContent: { ...s.streamingBranchContent, [branchId]: "" },
        isBranchStreaming: { ...s.isBranchStreaming, [branchId]: false },
      };
    }),

  openBranchTab: (branchId) =>
    set((s) => {
      const ids = s.openBranchIds.includes(branchId)
        ? s.openBranchIds
        : [...s.openBranchIds.slice(-4), branchId];
      return { openBranchIds: ids, activeBranchId: branchId, branchPanelOpen: true };
    }),

  closeBranchTab: (branchId) =>
    set((s) => {
      const ids = s.openBranchIds.filter((id) => id !== branchId);
      const newActive = s.activeBranchId === branchId ? (ids[ids.length - 1] ?? null) : s.activeBranchId;
      return { openBranchIds: ids, activeBranchId: newActive, branchPanelOpen: ids.length > 0 };
    }),

  setSelectedMainText: (sel) => set({ selectedMainText: sel }),

  addReferencedBranch: (id) =>
    set((s) =>
      s.referencedBranchIds.includes(id)
        ? {}
        : { referencedBranchIds: [...s.referencedBranchIds, id] },
    ),

  removeReferencedBranch: (id) =>
    set((s) => ({ referencedBranchIds: s.referencedBranchIds.filter((x) => x !== id) })),

  clearReferencedBranches: () => set({ referencedBranchIds: [] }),
}));
