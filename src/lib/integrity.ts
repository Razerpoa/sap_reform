import { prisma } from "@/lib/prisma";
import { calculateTotalKgFromCageData } from "@/lib/calculations";

export type IntegrityIssue = {
  date: string;
  type: "PRODUCTION" | "SALES" | "CASHFLOW" | "STOCK";
  message: string;
  expected: number | string;
  actual: number | string;
};

export type IntegrityResult = {
  status: "OK" | "ERROR";
  issues: IntegrityIssue[];
  stats: {
    totalProductionKg: number;
    totalSoldKg: number;
    currentStockKg: number;
  };
};

/**
 * Performs a full integrity check on the database data
 */
export async function runIntegrityCheck(): Promise<IntegrityResult> {
  const issues: IntegrityIssue[] = [];
  
  // 1. Fetch all data
  const [allProduction, allSales, allCashFlow] = await Promise.all([
    prisma.production.findMany({ orderBy: { date: "asc" } }),
    prisma.sales.findMany({ orderBy: { date: "asc" } }),
    prisma.cashFlow.findMany({ orderBy: { date: "asc" } }),
  ]);

  // 2. Map sales by date
  const salesByDate = new Map<string, number>();
  const salesRevenueByDate = new Map<string, number>();
  let totalSoldFromIndividualRecords = 0;

  for (const sale of allSales) {
    const dateKey = sale.date.toISOString().split("T")[0];
    
    const currentKg = salesByDate.get(dateKey) || 0;
    salesByDate.set(dateKey, currentKg + (sale.totalKg || 0));
    
    const currentRevenue = salesRevenueByDate.get(dateKey) || 0;
    salesRevenueByDate.set(dateKey, currentRevenue + (sale.subTotal || 0));

    totalSoldFromIndividualRecords += (sale.totalKg || 0);
  }

  // 3. Verify Production and Cumulative Stock
  let cumulativeProduction = 0;
  let cumulativeSold = 0;
  let lastProdKg = 0;
  let lastSoldKg = 0;

  for (const prod of allProduction) {
    const dateKey = prod.date.toISOString().split("T")[0];
    const dailyProdKg = calculateTotalKgFromCageData(prod.cageData as Record<string, any>);
    const dailySoldKg = salesByDate.get(dateKey) || 0;

    cumulativeProduction += dailyProdKg;
    cumulativeSold += dailySoldKg;

    // Check stored cumulative vs calculated
    if (Math.abs(prod.productionKg - cumulativeProduction) > 0.01) {
      issues.push({
        date: dateKey,
        type: "PRODUCTION",
        message: "Kumulatif produksi tidak sesuai",
        expected: cumulativeProduction.toFixed(2),
        actual: prod.productionKg.toFixed(2),
      });
    }

    if (Math.abs(prod.soldKg - cumulativeSold) > 0.01) {
      issues.push({
        date: dateKey,
        type: "SALES",
        message: "Kumulatif penjualan tidak sesuai",
        expected: cumulativeSold.toFixed(2),
        actual: prod.soldKg.toFixed(2),
      });
    }

    lastProdKg = prod.productionKg;
    lastSoldKg = prod.soldKg;
  }

  // 4. Verify CashFlow vs Sales synchronization
  for (const cf of allCashFlow) {
    const dateKey = cf.date.toISOString().split("T")[0];
    const expectedRevenue = salesRevenueByDate.get(dateKey) || 0;

    if (Math.abs(cf.totalPenjualan - expectedRevenue) > 1) { // 1 Rupiah margin
      issues.push({
        date: dateKey,
        type: "CASHFLOW",
        message: "Total penjualan di CashFlow tidak sesuai dengan data Sales",
        expected: expectedRevenue.toLocaleString("id-ID"),
        actual: cf.totalPenjualan.toLocaleString("id-ID"),
      });
    }
  }

  // 5. Final Stock Check
  const currentStock = lastProdKg - lastSoldKg;
  if (currentStock < -0.1) {
    issues.push({
      date: "GLOBAL",
      type: "STOCK",
      message: "Stok negatif terdeteksi",
      expected: ">= 0",
      actual: currentStock.toFixed(2),
    });
  }

  return {
    status: issues.length === 0 ? "OK" : "ERROR",
    issues,
    stats: {
      totalProductionKg: lastProdKg,
      totalSoldKg: lastSoldKg,
      currentStockKg: currentStock,
    }
  };
}
