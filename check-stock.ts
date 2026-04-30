(async () => {
  process.env.DATABASE_HOST = "localhost";
  const { prisma } = await import('./src/lib/prisma');

  const stock = await prisma.production.findMany({
    select: { date: true, productionKg: true, soldKg: true },
    orderBy: { date: 'asc' }
  });

  console.log('Production records (cumulative):');
  for (const s of stock) {
    console.log(s.date.toISOString().split('T')[0], 'productionKg:', s.productionKg, 'soldKg:', s.soldKg);
  }

  // Also check getCageStockData
  const { getCageStockData } = await import('./src/lib/data');
  const cageStock = await getCageStockData();
  console.log('\nCage stock (cumulative total):');
  console.log(JSON.stringify(cageStock, null, 2));
})();