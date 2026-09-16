import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma-клиента. В dev Next.js перезагружает модули при HMR,
 * без кэша в globalThis плодились бы соединения.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
