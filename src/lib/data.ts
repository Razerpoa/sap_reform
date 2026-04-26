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

  // Sync CageStock for each cage in cageData
  if (data.cageData) {
    const cages = Object.keys(data.cageData);
    const dateStr = data.date.toISOString().split("T")[0];

    for (const cage of cages) {
      const cageInfo = data.cageData[cage];
      if (!cageInfo) continue;

      // Calculate productionKg for this cage
      // Same formula as in types.ts calculateGlobalStats
      let productionKg = 0;

      // Rows: peti checkbox adds 15kg silently
      cageInfo.rows?.forEach((row: any) => {
        if (row.peti) productionKg += 15;
      });

      // Extra section: manual kg entry + butir/tray converted to butir
      // The structure from frontend uses 'extra', but our type uses 'footer'
      const extraData = (cageInfo as any).extra || cageInfo.footer || {};
      productionKg += parseFloat(extraData?.extraKg) || 0;

      // Call stock API to sync
      await syncCageStock(dateStr, cage, productionKg, 0);
    }
  }

  revalidatePath("/");
  return entry;
}

/**
 * Sync CageStock for a cage on a given date
 * Called by production and sales saves
 */
async function syncCageStock(dateStr: string, kandang: string, productionKg: number, soldKg: number) {
  const dateObj = new Date(dateStr);

  // Find existing row for this date + cage
  const existingRow = await prisma.cageStock.findUnique({
    where: {
      date_kandang: {
        date: dateObj,
        kandang,
      },
    },
  });

  let openingKg = 0;

  if (!existingRow) {
    // Lazy creation: look up yesterday's closingKg for this cage
    const yesterday = new Date(dateObj);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayRow = await prisma.cageStock.findUnique({
      where: {
        date_kandang: {
          date: yesterday,
          kandang,
        },
      },
    });

    // Use yesterday's closingKg as today's openingKg
    openingKg = yesterdayRow?.closingKg || 0;
  } else {
    // Use existing openingKg from the row
    openingKg = existingRow.openingKg;
  }

  // Calculate new closingKg
  const newProductionKg = existingRow ? existingRow.productionKg + productionKg : productionKg;
  const newSoldKg = existingRow ? existingRow.soldKg + soldKg : soldKg;
  const closingKg = openingKg + newProductionKg - newSoldKg;

  // Upsert the row
  await prisma.cageStock.upsert({
    where: {
      date_kandang: {
        date: dateObj,
        kandang,
      },
    },
    update: {
      productionKg: newProductionKg,
      soldKg: newSoldKg,
      closingKg,
    },
    create: {
      date: dateObj,
      kandang,
      openingKg,
      productionKg: newProductionKg,
      soldKg: newSoldKg,
      closingKg,
    },
  });
}

export type CashFlowSaveInput = {
  date: Date;
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
  up?: number;
  // New dynamic salaries field
  salaries?: Record<string, number>;
  // Legacy fields - kept for backward compatibility
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

  // Sync CageStock: deduct soldKg from source cages
  if (sourceCages && sourceCages.length > 0 && data.jmlPeti) {
    const dateStr = data.date.toISOString().split("T")[0];

    for (const cage of sourceCages) {
      // Handle both old format (string) and new format (object)
      const kandang = typeof cage === 'string' ? cage : cage.kandang;
      const jmlPeti = typeof cage === 'string' ? 0 : (cage.jmlPeti || 0);
      const jmlKg = typeof cage === 'string' ? 0 : (cage.jmlKg || 0);
      
      // Calculate sold kg for this cage: jmlPeti * 15 + jmlKg
      const soldKgForCage = jmlPeti * 15 + jmlKg;
      
      if (soldKgForCage > 0) {
        await syncCageStock(dateStr, kandang, 0, soldKgForCage);
      }
    }
  }

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