/**
 * Set user role script
 * Usage: npx tsx scripts/set-role.ts user@example.com admin
 *        npx tsx scripts/set-role.ts user@example.com whitelisted
 */

import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const createPrismaClient = () => {
  const host = process.env.DATABASE_HOST || "localhost";
  const url = "postgresql://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@" + host + "/sap_reform?schema=public";
  const isProxy = url.startsWith("prisma://") || url.startsWith("prisma+postgres://");

  if (isProxy) {
    return new PrismaClient({
      // @ts-ignore
      accelerateUrl: url,
    }).$extends(withAccelerate());
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    // @ts-ignore
    adapter
  });
};

const prisma = createPrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3]?.toUpperCase();

  if (!email || !role) {
    console.error("Usage: npx tsx scripts/set-role.ts <email> <admin|whitelisted>");
    console.error("Example: npx tsx scripts/set-role.ts user@example.com admin");
    process.exit(1);
  }

  if (role !== "ADMIN" && role !== "WHITELISTED") {
    console.error("Role must be either ADMIN or WHITELISTED");
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: role as UserRole },
    });

    console.log(`Updated ${user.email} to role: ${role}`);
  } catch (error: any) {
    if (error.code === "P2025") {
      console.error(`User not found: ${email}`);
      console.error("User must sign in first to be created in the database.");
      process.exit(1);
    }
    throw error;
  } finally {
    // @ts-ignore
    await prisma.$disconnect();
  }
}

main();