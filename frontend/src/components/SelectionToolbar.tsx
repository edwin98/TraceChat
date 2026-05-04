import type { BranchIntent, SelectedMainText } from "../types";

interface Props {
  selection: SelectedMainText;
  onCreateBranch: (intent: BranchIntent) => void;
  onClose: () => void;
}

const INTENTS: { intent: BranchIntent; label: string }[] = [
  { intent: "explain", label: "解释" },
  { intent: "background", label: "背景" },
  { intent: "derive", label: "推导" },
  { intent: "search", label: "查询" },
  { intent: "custom", label: "自定义" },
];

export function SelectionToolbar({ selection, onCreateBranch, onClose }: Props) {
  const top = selection.rect.top + window.scrollY - 44;
  const left = selection.rect.left + window.scrollX;

  return (
    <div
      className="fixed z-50 flex gap-1 bg-gray-900 text-white rounded-lg px-2 py-1.5 shadow-xl"
      style={{ top, left }}
    >
      {INTENTS.map(({ intent, label }) => (
        <button
          key={intent}
          onClick={() => {
            onCreateBranch(intent);
            onClose();
          }}
          className="px-2 py-0.5 text-xs rounded hover:bg-gray-700 transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
