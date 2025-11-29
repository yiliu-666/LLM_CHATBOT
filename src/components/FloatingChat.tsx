// src/components/FloatingChat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useState } from "react";

type FloatingChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuestion?: string;
};

export function FloatingChat({ open, onOpenChange, initialQuestion }: FloatingChatProps) {
  const [input, setInput] = useState("");

  const [threadId] = useState(() => crypto.randomUUID());

  const { messages, sendMessage, setMessages } = useChat<UIMessage>({
    id: `floating-${threadId}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            conversationId: threadId,
          },
        };
      },
    }),
  });

  // initialQuestion 更新时，把内容放入输入框并打开小窗
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setInput(initialQuestion);
      onOpenChange(true);
      // 如果你想每次都是新的对话，可以在这里清理历史：
      // setMessages([]);
    }
  }, [initialQuestion, onOpenChange, setMessages]);

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="fixed right-4 bottom-4 z-50 w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600"
      >
        聊
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 w-96 h-[480px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
          小窗问答
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-xs text-gray-400 text-center mt-4">
            在这里单独问一些细节问题，不会影响主对话。
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <div key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 输入区 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在这里追问当前内容..."
            className="flex-1 px-3 py-2 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 text-xs rounded-full bg-blue-500 text白 disabled:bg-gray-300"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
