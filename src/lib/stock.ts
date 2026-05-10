/**
 * Stock calculation utilities for SAP Reform
 * No Next.js dependencies — safe for standalone scripts
 */
import { prisma } from "@/lib/prisma";
import { calculateTotalKgFromCageData } from "@/lib/calculations";

/**
 * Recalculate cumulative productionKg and soldKg for ALL dates
 * This runs after every production or sales save to ensure stock is always accurate
 */
export async function recalculateStock() {
  // Get all production records sorted by date
  const allProduction = await prisma.production.findMany({
    orderBy: { date: "asc" },
  });

  // Get all sales records
  const allSales = await prisma.sales.findMany({});

  // Calculate cumulative soldKg per date
  const salesByDate = new Map<string, number>();
  for (const sale of allSales) {
    const dateKey = sale.date.toISOString().split("T")[0];
    const current = salesByDate.get(dateKey) || 0;
    salesByDate.set(dateKey, current + (sale.totalKg || 0));
  }

  // Calculate cumulative productionKg per date (from cageData)
  const productionByDate = new Map<string, number>();
  for (const prod of allProduction) {
    const dateKey = prod.date.toISOString().split("T")[0];
    const totalKg = calculateTotalKgFromCageData(prod.cageData as Record<string, any>);

    const current = productionByDate.get(dateKey) || 0;
    productionByDate.set(dateKey, current + totalKg);
  }

  // Calculate cumulative totals and update each production row
  let cumulativeProduction = 0;
  let cumulativeSold = 0;

  for (const prod of allProduction) {
    const dateKey = prod.date.toISOString().split("T")[0];
    const prodKg = productionByDate.get(dateKey) || 0;
    const soldKg = salesByDate.get(dateKey) || 0;

    // Accumulate: add today to previous cumulative
    cumulativeProduction += prodKg;
    cumulativeSold += soldKg;

    await prisma.production.update({
      where: { date: prod.date },
      data: {
        productionKg: cumulativeProduction,
        soldKg: cumulativeSold,
      },
    });
  }
}