import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "";
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
  const envEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
  const emails = [
    "fathandwipayana@gmail.com",
    ...envEmails,
  ];

  console.log("Seeding whitelisted users...");

  for (const email of emails) {
    // @ts-ignore
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split("@")[0],
      },
    });
  }

  const cages = ["B1", "B1+", "B2", "B2+", "B3", "B3+"];
  for (const kandang of cages) {
    // @ts-ignore
    await prisma.cageMaster.upsert({
      where: { kandang },
      update: {},
      create: { kandang, jmlAyam: 1000 },
    });
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // @ts-ignore
    await prisma.$disconnect();
  });
