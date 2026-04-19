import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as { prisma: any };

const connectionString = process.env.DATABASE_URL || "";

const getPrismaClient = () => {
  // If we have a prisma+postgres URL, we should use accelerate
  if (connectionString.startsWith('prisma://')) {
    return new PrismaClient().$extends(withAccelerate());
  }

  // Otherwise, use the standard driver adapter
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }).$extends(withAccelerate());
};

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
