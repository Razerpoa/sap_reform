/**
 * Centralized data fetching for SAP Reform
 * All database queries go through these functions
 */
import { prisma } from "@/lib/prisma";
import { getWIBDateString } from "@/lib/date-utils";
import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { calculateCageMasterFields } from "@/lib/calculations";

// Type definitions for the new JSON-based production structure
export type CageRow = {
  peti: boolean;
  tray: number;
  butir: number;
};

export type CageFooter = {
  totalTray: number;
  totalButir: number;
  totalKg: number;
};

export type CageData = {
  rows: CageRow[];
  footer: CageFooter;
};

export type ProductionCageData = Record<string, CageData>;

// ==================== PRODUCTION DATA ====================

/**
 * Fetch production entries (default: last 30 days, newest first)
 */
export async function getProductionData(options?: {
  take?: number;
  date?: string;
}) {
  const { take = 30 } = options || {};
  
  if (options?.date) {
    // Fetch single day
    const date = new Date(options.date);
    const entries = await prisma.production.findMany({
      where: { date },
      orderBy: { date: "desc" },
    });
    return entries;
  }
  
  // Fetch last N days
  const entries = await prisma.production.findMany({
    orderBy: { date: "desc" },
    take,
  });
  return entries;
}

/**
 * Get today's production entry
 */
export async function getTodayProduction() {
  const today = getWIBDateString();
  const entries = await getProductionData({ date: today });
  return entries[0] || null;
}

// ==================== CASHFLOW DATA ====================

/**
 * Fetch cashflow entries (default: last 30 days, newest first)
 */
export async function getCashFlowData(options?: {
  take?: number;
  date?: string;
}) {
  const { take = 30 } = options || {};
  
  if (options?.date) {
    const date = new Date(options.date);
    const entries = await prisma.cashFlow.findMany({
      where: { date },
      orderBy: { date: "desc" },
    });
    return entries;
  }
  
  const entries = await prisma.cashFlow.findMany({
    orderBy: { date: "desc" },
    take,
  });
  return entries;
}

/**
 * Get today's cashflow entry
 */
export async function getTodayCashFlow() {
  const today = getWIBDateString();
  const entries = await getCashFlowData({ date: today });
  return entries[0] || null;
}

// ==================== SALES DATA ====================

/**
 * Fetch sales entries (default: last 30 days, newest first)
 */
export async function getSalesData(options?: {
  take?: number;
  date?: string;
}) {
  const { take = 30 } = options || {};
  
  if (options?.date) {
    const date = new Date(options.date);
    const entries = await prisma.sales.findMany({
      where: { date },
      orderBy: { date: "desc" },
    });
    return entries;
  }
  
  const entries = await prisma.sales.findMany({
    orderBy: { date: "desc" },
    take,
  });
  return entries;
}

/**
 * Get today's sales entries
 */
export async function getTodaySales() {
  const today = getWIBDateString();
  const entries = await getSalesData({ date: today });
  return entries;
}

// ==================== MASTER DATA ====================

/**
 * Fetch cage master data
 */
export async function getMasterData() {
  const data = await prisma.cageMaster.findMany({
    orderBy: { kandang: "asc" },
  });
  return data;
}

// ==================== COMBINED DASHBOARD DATA ====================

/**
 * Fetch all data needed for dashboard at once
 * Uses Promise.all for parallel fetching (fast!)
 */
export async function getDashboardData(options?: {
  take?: number;
}) {
  const { take = 30 } = options || {};
  
  const [productionEntries, cashFlowEntries, salesEntries, otherExpenses] = await Promise.all([
    getProductionData({ take }),
    getCashFlowData({ take }),
    getSalesData({ take }),
    getOtherExpensesData({ take }),
  ]);
  
  return {
    productionEntries,
    cashFlowEntries,
    salesEntries,
    otherExpenses,
  };
}

// ==================== REFRESH UTILITY ====================

/**
 * Force cache busting - use this for real-time data
 * Add timestamp to URL to bypass Next.js cache
 */
export function createCacheBuster(): string {
  return `?t=${Date.now()}`;
}

// ==================== SAVE FUNCTIONS ====================

import { calculateSalesRevenue, calculateSalesTotals } from "@/lib/calculations";
import { revalidatePath } from "next/cache";

export type ProductionSaveInput = {
  date: Date;
  cageData?: ProductionCageData;
  cageSummary?: ProductionCageData;
  up?: number;
  operasional?: number;
  profitDaily?: number;
};

/**
 * Save production data (upsert)
 * Returns the saved entry
 */
export async function saveProductionData(data: ProductionSaveInput) {
  const entry = await prisma.production.upsert({
    where: { date: data.date },
    update: {
      cageData: data.cageData || {},
      cageSummary: data.cageSummary || {},
    },
    create: {
      date: data.date,
      cageData: data.cageData || {},
      cageSummary: data.cageSummary || {},
    },
  });

  // Recalculate cumulative stock after saving production
  await recalculateStock();

  revalidatePath("/");
  return entry;
}

/**
 * Recalculate cumulative productionKg and soldKg for ALL dates
 * This runs after every production or sales save to ensure stock is always accurate
 */
async function recalculateStock() {
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
    let totalKg = 0;

    const cageData = prod.cageData as Record<string, any>;
    for (const cageKey of Object.keys(cageData || {})) {
      const cageInfo = cageData[cageKey];
      if (!cageInfo) continue;

      // Rows: peti checkbox adds 15kg
      cageInfo.rows?.forEach((row: any) => {
        if (row.peti) totalKg += 15;
      });

      // Extra section
      const extraData = cageInfo.extra || {};
      totalKg += parseFloat(extraData?.extraKg) || 0;
    }

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

/**
 * Get stock data for all cages
 * Returns cumulative production, sold, and stock per cage
 */
export async function getCageStockData(): Promise<Record<string, { productionKg: number; soldKg: number; stockKg: number; stockPeti: number }>> {
  const result: Record<string, { productionKg: number; soldKg: number; stockKg: number; stockPeti: number }> = {};

  // Get all production records
  const allProduction = await prisma.production.findMany({
    orderBy: { date: "asc" },
  });

  // Get all sales records
  const allSales = await prisma.sales.findMany({});

  // Calculate per-cage production from cageData
  const cageProduction = new Map<string, number>();
  for (const prod of allProduction) {
    const cageData = prod.cageData as Record<string, any>;
    for (const cageKey of Object.keys(cageData || {})) {
      const cageInfo = cageData[cageKey];
      if (!cageInfo) continue;

      let totalKg = 0;

      // Rows: peti checkbox adds 15kg
      cageInfo.rows?.forEach((row: any) => {
        if (row.peti) totalKg += 15;
      });

      // Extra section
      const extraData = cageInfo.extra || {};
      totalKg += parseFloat(extraData?.extraKg) || 0;

      const current = cageProduction.get(cageKey) || 0;
      cageProduction.set(cageKey, current + totalKg);
    }
  }

  // Calculate per-cage sold from sourceCages
  const cageSold = new Map<string, number>();
  for (const sale of allSales) {
    const sourceCages = sale.sourceCages as { kandang: string; jmlPeti: number; jmlKg: number }[] || [];
    for (const cage of sourceCages) {
      if (!cage.kandang) continue;
      const soldKg = (cage.jmlPeti || 0) * 15 + (cage.jmlKg || 0);
      const current = cageSold.get(cage.kandang) || 0;
      cageSold.set(cage.kandang, current + soldKg);
    }
  }

  // Merge all cages from both maps
  const allCages = new Set([...cageProduction.keys(), ...cageSold.keys()]);

  for (const cage of allCages) {
    const productionKg = cageProduction.get(cage) || 0;
    const soldKg = cageSold.get(cage) || 0;
    const stockKg = productionKg - soldKg;

    result[cage] = {
      productionKg,
      soldKg,
      stockKg,
      stockPeti: Math.floor(stockKg / 15),
    };
  }

  return result;
}

export type CashFlowSaveInput = {
  date: Date;
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
  up?: number;
  // New dynamic salaries field
  salaries?: Record<string, number>;
  devidenA?: number;
  devidenB?: number;
  saldoKas?: number;
  saldoPemasukan?: number;
  saldoKewajiban?: number;
  saldoRekening?: number;
  saldoCash?: number;
};

/**
 * Save cashflow data (update existing or create new)
 * Returns the saved entry
 */
export async function saveCashFlowData(data: CashFlowSaveInput) {
  // Find existing entry for the date
  const existing = await prisma.cashFlow.findFirst({
    where: { date: data.date }
  });
  
  // Prepare data for saving - only include non-legacy fields and new salaries
  const saveData: any = {
    date: data.date,
    totalPenjualan: data.totalPenjualan,
    biayaPakan: data.biayaPakan,
    biayaOperasional: data.biayaOperasional,
    up: data.up,
    salaries: data.salaries || {},
    devidenA: data.devidenA,
    devidenB: data.devidenB,
    saldoKas: data.saldoKas,
    saldoPemasukan: data.saldoPemasukan,
    saldoKewajiban: data.saldoKewajiban,
    saldoRekening: data.saldoRekening,
    saldoCash: data.saldoCash,
  };
  
  const entry = existing
    ? await prisma.cashFlow.update({
        where: { id: existing.id },
        data: saveData,
      })
    : await prisma.cashFlow.create({ data: saveData });

  revalidatePath("/");
  return entry;
}

export type SalesSaveInput = {
  id?: string;
  date: Date;
  customerName: string;
  jmlPeti?: number | null;
  totalKg?: number | null;
  hargaSentral?: number | null;
  up?: number | null;
  hargaJual?: number | null;
  subTotal?: number | null;
  totalKgHariIni?: number | null;
  totalPetiHariIni?: number | null;
  penjualanHariIni?: number | null;
  totalProduksi?: number | null;
  stockAkhir?: number | null;
  sourceCages?: string[] | null | { kandang: string; jmlPeti: number; jmlKg: number }[];
};

/**
 * Save sales data (create or update)
 * Returns the saved entry
 */
export async function saveSalesData(data: SalesSaveInput) {
  // Calculate subTotal if not provided
  const subTotal = data.subTotal || calculateSalesRevenue(data.totalKg || 0, data.hargaJual || 0);

  // Get existing entries for this date to calculate daily totals
  const existingEntries = await prisma.sales.findMany({
    where: { date: data.date },
  });

  const dailyTotals = calculateSalesTotals(existingEntries, {
    totalKg: data.totalKg || 0,
    jmlPeti: data.jmlPeti || 0,
    hargaJual: data.hargaJual || 0,
  });

  const { id, sourceCages, ...saveData } = data;
  const entry = id
    ? await prisma.sales.update({
        where: { id },
        data: { ...saveData, subTotal, sourceCages, ...dailyTotals } as any,
      })
    : await prisma.sales.create({
        data: { ...saveData, subTotal, sourceCages, ...dailyTotals } as any,
      });

  // Recalculate cumulative stock after saving sales
  await recalculateStock();

  // Sync to CashFlow: Update totalPenjualan for this date
  const totalRevenueForDay = dailyTotals.penjualanHariIni || 0;
  
  // Find or create cashflow entry for this date
  const existingCashFlow = await prisma.cashFlow.findFirst({
    where: { date: data.date }
  });

  if (existingCashFlow) {
    await prisma.cashFlow.update({
      where: { id: existingCashFlow.id },
      data: { totalPenjualan: totalRevenueForDay }
    });
  } else {
    // Create new entry with this revenue
    await prisma.cashFlow.create({
      data: { 
        date: data.date,
        totalPenjualan: totalRevenueForDay,
        // Other fields default to 0
      },
    });
  }

  revalidatePath("/");
  return entry;
}

export type MasterSaveInput = {
  id?: string;
  kandang: string;
  jmlAyam?: number;
  jmlEmber?: number;
  jmlPakan?: number;
  gramEkor?: number;
  beratPakan?: number | null;
  volEmber?: number | null;
  hargaPakan?: number | null;
  faktorPakan?: number;
};

/**
 * Save master data (upsert)
 * Automatically calculates derived fields from input
 * Returns the saved entry
 */
export async function saveMasterData(data: MasterSaveInput) {
  // Calculate derived fields automatically
  const calculated = calculateCageMasterFields({
    jmlAyam: data.jmlAyam ?? 0,
    jmlEmber: data.jmlEmber ?? 0,
    jmlPakan: data.jmlPakan ?? 0,
    hargaPakan: data.hargaPakan ?? undefined,
  });

  // Merge input with calculated fields (input takes precedence over defaults)
  const mergedData = {
    ...data,
    ...calculated,
  };

  // Filter out undefined values for Prisma operations
  const cleanData = Object.fromEntries(
    Object.entries(mergedData).filter(([_, v]) => v !== undefined && v !== null)
  ) as unknown as Prisma.CageMasterUpdateInput & Prisma.CageMasterCreateInput;

  // Use cuid-based ID for upsert (new schema uses @id @default(cuid()))
  const where = data.id 
    ? { id: data.id } 
    : { kandang: data.kandang };

  const entry = await prisma.cageMaster.upsert({
    where,
    update: cleanData,
    create: cleanData,
  });

  revalidatePath("/");
  return entry;
}

// ==================== OTHER EXPENSES DATA ====================

/**
 * Fetch other expenses by date
 */
export async function getOtherExpensesData(options?: {
  take?: number;
  date?: string;
}) {
  const { take = 30 } = options || {};
  
  if (options?.date) {
    const date = new Date(options.date);
    const entries = await prisma.otherExpense.findMany({
      where: { date },
      orderBy: { createdAt: "desc" },
    });
    return entries;
  }
  
  const entries = await prisma.otherExpense.findMany({
    orderBy: { date: "desc" },
    take,
  });
  return entries;
}

export type OtherExpenseSaveInput = {
  id?: string;
  date: Date;
  amount: number;
  description: string;
};

/**
 * Save other expense (create or update)
 * Returns the saved entry
 */
export async function saveOtherExpenseData(data: OtherExpenseSaveInput) {
  const { id, ...saveData } = data;
  const entry = id
    ? await prisma.otherExpense.update({
        where: { id },
        data: saveData,
      })
    : await prisma.otherExpense.create({
        data: saveData,
      });

  revalidatePath("/");
  return entry;
}

/**
 * Delete other expense
 */
export async function deleteOtherExpenseData(id: string) {
  await prisma.otherExpense.delete({
    where: { id },
  });
  revalidatePath("/");
}