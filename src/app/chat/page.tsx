"use client";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { FloatingChat } from "@/components/FloatingChat";

type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};
type SelectionPopoverState = {
  text: string;
  x: number; // 屏幕坐标
  y: number;
} | null;
export default function Chat() {
  const [input, setInput] = useState('');

  // ⭐ 会话列表 & 当前会话
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopoverState>(null);

  const [floatingOpen, setFloatingOpen] = useState(false);
  const [floatingQuestion, setFloatingQuestion] = useState<string | undefined>();


  // ⭐ useChat，注意这里用 currentConversationId 参与请求体
  const { messages, sendMessage, setMessages } = useChat<UIMessage>({
    id: currentConversationId ?? 'default', // 切换会话时帮助区分
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            conversationId: currentConversationId, // 当前会话 id
          },
        };
      },
    }),
  });

  const handleFloatingOpenChange = (open: boolean) => {
    setFloatingOpen(open);
    if (!open) setFloatingQuestion(undefined);
  };

  function handleAskInFloating(text: string) {
    setFloatingQuestion(
      `我不太理解下面这段话，帮我用通俗一点的方式解释：\n\n${text}`,
    );
    setFloatingOpen(true);
  }

  // 1️⃣ 页面加载时，获取会话列表
  useEffect(() => {
    async function loadConversations() {
      setLoadingConversations(true);
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        const list: Conversation[] = data.conversations ?? [];
        setConversations(list);

        if (list.length > 0) {
          // 默认选中第一个会话
          setCurrentConversationId(list[0].id);
        } else {
          // 没有会话时自动创建一个
          const created = await createNewConversationOnServer();
          setConversations([created]);
          setCurrentConversationId(created.id);
        }
      } catch (e) {
        console.error('加载会话列表失败', e);
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, []);

  // 2️⃣ 每当 currentConversationId 变化，就从后端拉取该会话的历史消息
  useEffect(() => {
    if (!currentConversationId) return;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat?conversationId=${currentConversationId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages); // UIMessage[]
        }
      } catch (e) {
        console.error('加载历史消息失败', e);
      }
    }

    loadHistory();
  }, [currentConversationId, setMessages]);

  // 3️⃣ 新建会话：调用 /api/conversations，再切到新的会话
  async function handleNewConversation() {
    const conv = await createNewConversationOnServer();
    setConversations(prev => [conv, ...prev]);
    setCurrentConversationId(conv.id);
    setMessages([]); // 清空当前聊天窗口
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
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

          {conversations.map(conv => {
            const active = conv.id === currentConversationId;
            return (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-800
                  ${active ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`
                }
              >
                <div className="font-medium truncate">
                  {conv.title || '未命名会话'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(conv.updatedAt).toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 右侧：聊天区域（你原来的 UI 基本照搬） */}
      <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto">
        {/* 消息列表区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          onMouseUp={(e) => {
            // 只在浏览器端有 window，这里是 client 组件，安全
            const selection = window.getSelection();

            // 没有选区 / 选区是空的：直接隐藏工具条
            if (!selection || selection.isCollapsed) {
              setSelectionPopover(null);
              return;
            }

            const text = selection.toString().trim();
            if (!text) {
              setSelectionPopover(null);
              return;
            }

            // 选区的第一个 range
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 计算工具条应该出现的位置（选区上方居中一点点）
            const x = rect.left + rect.width / 2;
            const y = rect.top; // 工具条再往上挪一点

            setSelectionPopover({
              text,
              x,
              y,
            });

            // ❌ 此处不要清除选区，保持用户看到仍然高亮
            // selection.removeAllRanges();
          }}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 dark:text-gray-500 text-center">
                {currentConversationId ? '开始对话吧...' : '正在初始化会话...'}
              </p>
            </div>
          )}
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                  }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <div key={`${message.id}-${i}`} className="text-sm leading-relaxed">
                            {part.text}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 输入框区域 */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (input.trim() && currentConversationId) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            className="p-4"
          >
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                value={input}
                placeholder="输入消息..."
                onChange={e => setInput(e.target.value)}
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
      {/* ⭐ 悬浮聊天小窗：全局挂一个就行 */}
      <FloatingChat
        open={floatingOpen}
        onOpenChange={handleFloatingOpenChange}
        initialQuestion={floatingQuestion}
      />
      {selectionPopover && (
        <div
          className="z-50"
          style={{
            position: "fixed",
            // 稍微往上挪 8 像素
            top: selectionPopover.y - 8,
            left: selectionPopover.x,
            transform: "translate(-50%, -100%)", // 居中 & 在上方
          }}
          onMouseDown={(e) => e.stopPropagation()} // 避免点击时影响选区
        >
          <div className="flex items-center gap-1 rounded-full bg-gray-900 text-white text-xs px-2 py-1 shadow-lg">
            <button
              className="px-2 py-0.5 hover:bg-gray-700 rounded-full"
              onClick={() => {
                handleAskInFloating(selectionPopover.text);
                setSelectionPopover(null);
                // 清除选中高亮
                const sel = window.getSelection();
                sel?.removeAllRanges();
              }}
            >
              在小窗中提问
            </button>
            <button
              className="px-1 py-0.5 hover:bg-gray-700 rounded-full"
              onClick={() => {
                setSelectionPopover(null);
                const sel = window.getSelection();
                sel?.removeAllRanges();
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 🔧 抽一个小函数：调用后端创建会话
async function createNewConversationOnServer(): Promise<Conversation> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '新对话' }),
  });
  const data = await res.json();
  return data.conversation as Conversation;
}
