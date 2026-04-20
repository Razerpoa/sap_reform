import { calculateDashboardStats } from '../src/lib/calculations';
import { getProductionData, getCashFlowData, getSalesData } from '../src/lib/data';

async function test() {
  console.log('Fetching production entries...');
  const productionEntries = await getProductionData({ take: 30 });
  console.log('Fetching cashflow entries...');
  const cashFlowEntries = await getCashFlowData({ take: 30 });
  console.log('Fetching sales entries...');
  const salesEntries = await getSalesData({ take: 30 });

  console.log('Production entries found:', productionEntries.length);
  if (productionEntries.length > 0) {
    console.log('Latest production date:', productionEntries[0].date);
    console.log('Latest production totalKg:', productionEntries[0].totalKg);
  }

  console.log('Calculating stats...');
  const stats = calculateDashboardStats(productionEntries, cashFlowEntries, salesEntries);
  console.log('--- Stats Result ---');
  console.log('productionLatestKg:', stats.productionLatestKg);
  console.log('--- End ---');
}

test().catch(console.error);
