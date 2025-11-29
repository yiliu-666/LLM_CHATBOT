// hooks/useFloatingThread.ts
import { useState, useCallback } from "react";

export function useFloatingThread() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<string | undefined>();

  const askWithText = useCallback((text: string) => {
    setQuestion(
      `我不太理解下面这段话，帮我通俗解释并举例说明：\n\n${text}`,
    );
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuestion(undefined);
  }, []);

  return {
    open,
    question,
    askWithText,
    handleOpenChange,
  };
}
