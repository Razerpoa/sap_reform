import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const createPrismaClient = (): PrismaClient => {
  const url = "postgresql://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@" + process.env.DATABASE_HOST + "/sap_reform?schema=public";
  const isProxy = url.startsWith("prisma://") || url.startsWith("prisma+postgres://");

  if (isProxy) {
    // Proxy/Accelerate flow
    // @ts-ignore - Accelerate extension has type compatibility issues
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

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };