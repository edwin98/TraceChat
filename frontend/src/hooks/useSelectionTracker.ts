import { useEffect } from "react";
import type { SelectedMainText } from "../types";

export function useSelectionTracker(
  onSelect: (sel: SelectedMainText | null) => void,
) {
  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
        onSelect(null);
        return;
      }

      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element =
        container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : (container as Element);

      const messageEl = element?.closest("[data-message-id]");
      if (!messageEl) {
        onSelect(null);
        return;
      }

      onSelect({
        messageId: messageEl.getAttribute("data-message-id")!,
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        rect: range.getBoundingClientRect(),
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [onSelect]);
}
