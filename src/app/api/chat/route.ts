import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import { prisma } from '@/lib/db';
// ===== GET：根据 conversationId 返回历史消息（UIMessage[]） =====
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return new Response(
      JSON.stringify({ messages: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 从 MySQL 取历史消息
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  // 映射成 AI SDK 的 UIMessage 格式
  const messages: UIMessage[] = rows.map((m) => ({
    id: m.id,
    role: m.role as any,
    parts: [
      {
        type: 'text',
        text: m.content,
      },
    ],
  }));

  return new Response(
    JSON.stringify({ messages }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

type ChatRequestBody = {
  messages: UIMessage[];
  conversationId?: string;
};

export async function POST(req: Request) {
  const { messages, conversationId }: ChatRequestBody = await req.json();

  const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  // 1️⃣ 确保有一个会话记录
  let conversation;
  
  if (conversationId) {
    // 先尝试查找，找不到再创建
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          id: conversationId,
          title: '对话 ' + conversationId.slice(0, 6),
        },
      });
    }
  } else {
    // 没有 conversationId 就直接创建新对话
    conversation = await prisma.conversation.create({
      data: {
        title: '新对话',
      },
    });
  }

  const convId = conversation.id;

  // 2️⃣ 把“最新一条用户消息”存到 Message 表
  const last = messages[messages.length - 1];

  if (last && last.role === 'user') {
    // AI SDK v5 的 UIMessage 是 parts 数组，这里把 text 拼起来
    const text =
      last.parts
        ?.filter((p) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') ?? '';

    if (text.trim()) {
      await prisma.message.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: text,
        },
      });
    }
  }

  // 3️⃣ 调用大模型，同时在 onFinish 里把 AI 的回复也写入数据库
  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: convertToModelMessages(messages),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z
            .string()
            .describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
    // ⭐ 这里是持久化 AI 回复的关键
    onFinish: async ({ response }) => {
      // response.messages 是 ModelMessage[]
      for (const msg of response.messages) {
        if (msg.role !== 'assistant') continue;

        let text = '';

        // ModelMessage 可能是字符串，也可能是 parts
        if (typeof (msg as any).content === 'string') {
          text = (msg as any).content;
        } else if (Array.isArray((msg as any).content)) {
          text = (msg as any).content
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
        }

        if (text.trim()) {
          await prisma.message.create({
            data: {
              conversationId: convId,
              role: 'assistant',
              content: text,
            },
          });
        }
      }
    },
  });
  // 依然用 AI SDK 的 UIMessage 流式响应给前端
  return result.toUIMessageStreamResponse();
}