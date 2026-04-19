const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function sync() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Starting historical sales-to-cashflow sync...");

  // Get all sales grouped by date
  const salesByDate = await prisma.sales.groupBy({
    by: ['date'],
    _sum: {
      subTotal: true,
    },
  });

  console.log(`Found ${salesByDate.length} dates with sales entries.`);

  for (const entry of salesByDate) {
    const date = entry.date;
    const totalRevenue = entry._sum.subTotal || 0;

    // Use findFirst since date is not a unique ID in CashFlow
    const existing = await prisma.cashFlow.findFirst({
      where: { date }
    });

    if (existing) {
      await prisma.cashFlow.update({
        where: { id: existing.id },
        data: { totalPenjualan: totalRevenue }
      });
      console.log(`[UPDATE] ${date.toISOString().split('T')[0]} | Revenue: Rp ${totalRevenue.toLocaleString()}`);
    } else {
      await prisma.cashFlow.create({
        data: { 
          date, 
          totalPenjualan: totalRevenue 
        }
      });
      console.log(`[CREATE] ${date.toISOString().split('T')[0]} | Revenue: Rp ${totalRevenue.toLocaleString()}`);
    }
  }

  console.log("Sync complete!");
  await prisma.$disconnect();
}

sync().catch(e => {
  console.error("Sync failed:", e);
  process.exit(1);
});
