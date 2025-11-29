import { PrismaClient } from "../generated/prisma";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient({ log: ["error", "warn"], datasources: { db: { url: process.env.DATABASE_URL } } });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}