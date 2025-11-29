// hooks/useSelectionToolbar.ts
import { useState, useCallback } from "react";

export type SelectionState = {
  text: string;
  x: number;
  y: number;
} | null;

export function useSelectionToolbar() {
  const [selection, setSelection] = useState<SelectionState>(null);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const x = rect.left + rect.width / 2;
    const y = rect.top;

    setSelection({ text, x, y });
  }, []);

  const clear = useCallback(() => {
    setSelection(null);
    const sel = window.getSelection();
    sel?.removeAllRanges();
  }, []);

  return {
    selection,
    handleMouseUp,
    clear,
  };
}
