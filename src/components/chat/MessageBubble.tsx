// src/components/chat/MessageBubble.tsx
"use client";

import type { UIMessage } from "@ai-sdk/react"; // 或 '@ai-sdk/react' 的 UIMessage 类型路径

type MessageBubbleProps = {
  message: UIMessage;
  onTextMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

export function MessageBubble({ message, onTextMouseUp }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
        }`}
      >
        <div
          className="whitespace-pre-wrap break-words"
          onMouseUp={onTextMouseUp}
        >
          {message.parts.map((part, i) => {
            if (part.type !== "text") return null;
            return (
              <div key={`${message.id}-${i}`} className="text-sm leading-relaxed">
                {part.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
