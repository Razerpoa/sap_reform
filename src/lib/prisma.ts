import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as { prisma: any };

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "";
  const isProxy = url.startsWith("prisma://") || url.startsWith("prisma+postgres://");

  if (isProxy) {
    // Proxy/Accelerate flow
    return new PrismaClient({
      // @ts-ignore
      accelerateUrl: url,
      log: ["query"],
    }).$extends(withAccelerate());
  }

  // Direct connection flow (Docker/Standard Postgres)
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    // @ts-ignore
    adapter, 
    log: ["query"] 
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
