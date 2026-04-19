/**
 * Centralized data fetching for SAP Reform
 * All database queries go through these functions
 */
import { prisma } from "@/lib/prisma";
import { getWIBDateString } from "@/lib/date-utils";
import { startOfDay } from "date-fns";

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
  
  const [productionEntries, cashFlowEntries, salesEntries] = await Promise.all([
    getProductionData({ take }),
    getCashFlowData({ take }),
    getSalesData({ take }),
  ]);
  
  return {
    productionEntries,
    cashFlowEntries,
    salesEntries,
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

import { calculateProductionTotals } from "@/lib/calculations";
import { calculateSalesRevenue, calculateSalesTotals } from "@/lib/calculations";
import { revalidatePath } from "next/cache";

export type ProductionSaveInput = {
  date: Date;
  b1JmlTelur?: number;
  b1Kg?: number;
  b1Pct?: number;
  b1Fc?: number;
  b1Hpp?: number;
  b1pJmlTelur?: number;
  b1pKg?: number;
  b1pPct?: number;
  b1pFc?: number;
  b1pHpp?: number;
  b2JmlTelur?: number;
  b2Kg?: number;
  b2Pct?: number;
  b2Fc?: number;
  b2Hpp?: number;
  b2pJmlTelur?: number;
  b2pKg?: number;
  b2pPct?: number;
  b2pFc?: number;
  b2pHpp?: number;
  b3JmlTelur?: number;
  b3Kg?: number;
  b3Pct?: number;
  b3Fc?: number;
  b3Hpp?: number;
  b3pJmlTelur?: number;
  b3pKg?: number;
  b3pPct?: number;
  b3pFc?: number;
  b3pHpp?: number;
  totalJmlTelur?: number;
  totalKg?: number;
  totalPct?: number;
  totalFc?: number;
  totalHpp?: number;
  hargaSentral?: number;
  up?: number;
  hargaKandang?: number;
  profitDaily?: number;
  operasional?: number;
  profitMonthly?: number;
};

/**
 * Save production data (upsert)
 * Returns the saved entry
 */
export async function saveProductionData(data: ProductionSaveInput) {
  const { totalKg, totalJmlTelur } = calculateProductionTotals(data);

  const dataWithTotals = {
    ...data,
    totalKg,
    totalJmlTelur,
  };

  const entry = await prisma.production.upsert({
    where: { date: data.date },
    update: dataWithTotals,
    create: dataWithTotals,
  });

  revalidatePath("/");
  return entry;
}

export type CashFlowSaveInput = {
  date: Date;
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
  gajiBepuk?: number;
  gajiBarman?: number;
  gajiAgung?: number;
  gajiEki?: number;
  gajiAdi?: number;
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
  
  const entry = existing
    ? await prisma.cashFlow.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.cashFlow.create({ data });

  revalidatePath("/");
  return entry;
}

export type SalesSaveInput = {
  id?: string;
  date: Date;
  customerName: string;
  jmlPeti?: number | null;
  totalKg?: number | null;
  hargaCentral?: number | null;
  up?: number | null;
  hargaJual?: number | null;
  subTotal?: number | null;
  totalKgHariIni?: number | null;
  totalPetiHariIni?: number | null;
  penjualanHariIni?: number | null;
  totalProduksi?: number | null;
  stockAkhir?: number | null;
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

  const { id, ...saveData } = data;
  const entry = id
    ? await prisma.sales.update({
        where: { id },
        data: { ...saveData, subTotal, ...dailyTotals } as any,
      })
    : await prisma.sales.create({
        data: { ...saveData, subTotal, ...dailyTotals } as any,
      });

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
      }
    });
  }

  revalidatePath("/");
  return entry;
}

export type MasterSaveInput = {
  kandang: string;
  jmlAyam?: number;
  jmlEmber?: number;
  jmlPakan?: number;
  gramEkor?: number;
  beratPakan?: number | null;
  volEmber?: number | null;
  hargaPakan?: number | null;
};

/**
 * Save master data (upsert)
 * Returns the saved entry
 */
export async function saveMasterData(data: MasterSaveInput) {
  const entry = await prisma.cageMaster.upsert({
    where: { kandang: data.kandang },
    update: data,
    create: data,
  });

  revalidatePath("/");
  return entry;
}