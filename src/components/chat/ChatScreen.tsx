// src/components/chat/ChatScreen.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useState } from "react";

import { FloatingChat } from "@/components/FloatingChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SelectionToolbar } from "@/components/chat/SelectionToolbar";
import { useFloatingThread } from "@/hooks/useFloatingThread";
import { useSelectionToolbar } from "@/hooks/useSelectionToolbar";

type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ChatScreen() {
  const [input, setInput] = useState("");

  // 会话列表 & 当前会话
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // 悬浮小窗逻辑
  const {
    open: floatingOpen,
    question: floatingQuestion,
    askWithText,
    handleOpenChange,
  } = useFloatingThread();

  // 选区工具条逻辑
  const {
    selection,
    handleMouseUp: handleSelectionMouseUp,
    clear: clearSelection,
  } = useSelectionToolbar();

  // useChat：仍然以 currentConversationId 为粒度
  const { messages, sendMessage, setMessages } = useChat<UIMessage>({
    id: currentConversationId ?? "default",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            conversationId: currentConversationId,
          },
        };
      },
    }),
  });

  // 页面加载：获取会话列表
  useEffect(() => {
    async function loadConversations() {
      setLoadingConversations(true);
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        const list: Conversation[] = data.conversations ?? [];
        setConversations(list);

        if (list.length > 0) {
          setCurrentConversationId(list[0].id);
        } else {
          const created = await createNewConversationOnServer();
          setConversations([created]);
          setCurrentConversationId(created.id);
        }
      } catch (e) {
        console.error("加载会话列表失败", e);
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, []);

  // currentConversationId 变化时加载消息
  useEffect(() => {
    if (!currentConversationId) return;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat?conversationId=${currentConversationId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error("加载历史消息失败", e);
      }
    }

    loadHistory();
  }, [currentConversationId, setMessages]);

  async function handleNewConversation() {
    const conv = await createNewConversationOnServer();
    setConversations((prev) => [conv, ...prev]);
    setCurrentConversationId(conv.id);
    setMessages([]);
  }

  return (
    <>
      <div
        className="flex h-screen bg-gray-50 dark:bg-gray-900"
        onMouseDown={() => {
          if (selection) clearSelection();
        }}
      >
        {/* 左侧：会话列表 */}
        <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <span className="font-semibold text-gray-800 dark:text-gray-100">会话</span>
            <button
              onClick={handleNewConversation}
              className="px-2 py-1 text-xs rounded-full bg-blue-500 text-white hover:bg-blue-600"
            >
              新建
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations && (
              <div className="p-4 text-sm text-gray-500">加载中...</div>
            )}

            {!loadingConversations && conversations.length === 0 && (
              <div className="p-4 text-sm text-gray-500">暂无会话</div>
            )}

            {conversations.map((conv) => {
              const active = conv.id === currentConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversationId(conv.id)}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-800 ${
                    active
                      ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  <div className="font-medium truncate">
                    {conv.title || "未命名会话"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updatedAt).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右侧：聊天区域 */}
        <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 dark:text-gray-500 text-center">
                  {currentConversationId ? "开始对话吧..." : "正在初始化会话..."}
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onTextMouseUp={handleSelectionMouseUp}
              />
            ))}
          </div>

          {/* 输入框 */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg白 dark:bg-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim() && currentConversationId) {
                  sendMessage({ text: input });
                  setInput("");
                }
              }}
              className="p-4"
            >
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  value={input}
                  placeholder="输入消息..."
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !currentConversationId}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  发送
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 选区工具条 */}
      <SelectionToolbar
        selection={selection}
        onAsk={(text) => {
          askWithText(text);
          clearSelection();
        }}
        onClose={clearSelection}
      />

      {/* 悬浮聊天小窗 */}
      <FloatingChat
        open={floatingOpen}
        onOpenChange={handleOpenChange}
        initialQuestion={floatingQuestion}
      />
    </>
  );
}

// 调后端创建会话
async function createNewConversationOnServer(): Promise<Conversation> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "新对话" }),
  });
  const data = await res.json();
  return data.conversation as Conversation;
}
