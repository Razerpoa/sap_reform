import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";

const createPrismaClient = () => {
  const url = "postgresql://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@" + process.env.DATABASE_HOST + "/sap_reform?schema=public";
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

/**
 * Calculate derived CageMaster fields
 */
function calculateFields(jmlAyam: number, jmlEmber: number, jmlPakan: number, hargaPakan: number) {
  const gramEkor = jmlAyam > 0 ? jmlPakan / jmlAyam : 0;
  const beratPakan = jmlPakan * hargaPakan;
  const volEmber = jmlEmber > 0 ? jmlPakan / jmlEmber : 0;
  return { gramEkor, beratPakan, volEmber };
}

async function main() {
  const envEmails = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];

  console.log("Seeding whitelisted users...");

  for (const email of envEmails) {
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

  // Seed CageMaster with initial data from CSV
  const cages = [
    { kandang: "B1", jmlAyam: 777, jmlEmber: 7, jmlPakan: 91, hargaPakan: 7300 },
    { kandang: "B1+", jmlAyam: 963, jmlEmber: 8.5, jmlPakan: 110.5, hargaPakan: 7300 },
    { kandang: "B2", jmlAyam: 828, jmlEmber: 7, jmlPakan: 91, hargaPakan: 7300 },
    { kandang: "B2+", jmlAyam: 775, jmlEmber: 7, jmlPakan: 91, hargaPakan: 7300 },
    { kandang: "B3", jmlAyam: 822, jmlEmber: 7, jmlPakan: 91, hargaPakan: 7300 },
    { kandang: "B3+", jmlAyam: 911, jmlEmber: 9.5, jmlPakan: 123.5, hargaPakan: 7300 },
  ];

  for (const cage of cages) {
    const { gramEkor, beratPakan, volEmber } = calculateFields(
      cage.jmlAyam, cage.jmlEmber, cage.jmlPakan, cage.hargaPakan
    );

    // @ts-ignore
    await prisma.cageMaster.upsert({
      where: { kandang: cage.kandang },
      update: {},
      create: {
        kandang: cage.kandang,
        jmlAyam: cage.jmlAyam,
        jmlEmber: cage.jmlEmber,
        jmlPakan: cage.jmlPakan,
        hargaPakan: cage.hargaPakan,
        gramEkor,
        beratPakan,
        volEmber,
      },
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
