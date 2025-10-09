import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ 
    log: process.env.PRISMA_DEBUG === "true" 
      ? ["query", "error", "warn"] 
      : [] // No logging by default
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;