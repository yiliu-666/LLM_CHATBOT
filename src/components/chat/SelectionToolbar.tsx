// components/chat/SelectionToolbar.tsx
"use client";

import type { SelectionState } from "../../hooks/useSelectionToolbar";

type SelectionToolbarProps = {
  selection: SelectionState;
  onAsk: (text: string) => void;
  onClose: () => void;
};

export function SelectionToolbar({ selection, onAsk, onClose }: SelectionToolbarProps) {
  if (!selection) return null;

  return (
    <div
      className="z-50"
      style={{
        position: "fixed",
        top: selection.y - 8,
        left: selection.x,
        transform: "translate(-50%, -100%)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 rounded-full bg-gray-900 text-white text-xs px-2 py-1 shadow-lg">
        <button
          className="px-2 py-0.5 hover:bg-gray-700 rounded-full"
          onClick={() => onAsk(selection.text)}
        >
          在小窗中提问
        </button>
        <button
          className="px-1 py-0.5 hover:bg-gray-700 rounded-full"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
