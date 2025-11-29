// app/api/conversations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 获取所有会话列表
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' }, // 最近更新的排前面
  });

  return NextResponse.json({ conversations });
}

// 新建一个会话
export async function POST(req: Request) {
  let title: string | null = null;

  try {
    const body = await req.json();
    title = body?.title ?? null;
  } catch {
    // 没有 body 也没问题
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: title ?? '新对话',
    },
  });

  return NextResponse.json({ conversation });
}
