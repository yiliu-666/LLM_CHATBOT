import { prisma } from "./db";

export async function createConversation(title?: string, userId?: string) {
  return prisma.conversation.create({
    data: {
      title,
      userId,
    },
  });
}

export async function addMessage(params: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: any;
}) {
  return prisma.message.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      meta: params.meta,
    },
  });
}

export async function getConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listConversations(userId?: string) {
  return prisma.conversation.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { updatedAt: "desc" },
  });
}
