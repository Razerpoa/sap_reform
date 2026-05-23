/**
 * Centralized data fetching for SAP Reform
 * All database queries go through these functions
 */
import { prisma } from "@/lib/prisma";
import { getWIBDateString } from "@/lib/date-utils";
import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { calculateCageMasterFields, calculateTotalKgFromCageData } from "@/lib/calculations";

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

/**
 * Get a single sales entry by ID
 */
export async function getSalesById(id: string) {
  return await prisma.sales.findUnique({
    where: { id },
  });
}

/**
 * Get distinct customer names, optionally filtered by search query
 */
export async function getCustomerNames(search?: string) {
  const result = await prisma.sales.groupBy({
    by: ["customerName"],
    where: search
      ? { customerName: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { customerName: "asc" },
    take: 20,
  });
  return result.map((r) => r.customerName);
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
import { recalculateStock } from "@/lib/stock";
import { revalidatePath } from "next/cache";

export type ProductionSaveInput = {
  date: Date;
  cageData?: ProductionCageData;
  cageSummary?: ProductionCageData;
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
 * Get stock data for all cages, with FIFO month-split breakdown
 * Returns cumulative production, sold, stock per cage,
 * plus last-month / current-month stock split using FIFO logic.
 * @param untilDate - Optional date string (YYYY-MM-DD) to filter records up to that date
 */
export async function getCageStockData(untilDate?: string): Promise<Record<string, {
  productionKg: number;
  soldKg: number;
  stockKg: number;
  stockPeti: number;
  lastMonthStockKg: number;
  lastMonthStockPeti: number;
  lastMonthSisaKg: number;
  currentMonthStockKg: number;
  currentMonthStockPeti: number;
  currentMonthSisaKg: number;
}>> {
  const result: Record<string, any> = {};

  // Build date filter if untilDate is provided
  const refDate = untilDate ? new Date(untilDate) : new Date();
  const productionWhere = untilDate ? { date: { lte: refDate } } : {};
  const salesWhere = untilDate ? { date: { lte: refDate } } : {};

  // Month boundary: everything before current month is "last month" stock
  const currentMonthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);

  // Get production records (filtered by date if untilDate provided)
  const allProduction = await prisma.production.findMany({
    where: productionWhere,
    orderBy: { date: "asc" },
  });

  // Get sales records (filtered by date if untilDate provided)
  const allSales = await prisma.sales.findMany({
    where: salesWhere,
  });

  // Calculate per-cage production from cageData (total + month-split)
  const cageProduction = new Map<string, number>();
  const cagePrevProduction = new Map<string, number>();
  const cageCurrentProduction = new Map<string, number>();

  for (const prod of allProduction) {
    const cageData = prod.cageData as Record<string, any>;
    const isCurrent = prod.date >= currentMonthStart;

    for (const cageKey of Object.keys(cageData || {})) {
      const cageInfo = cageData[cageKey];
      if (!cageInfo) continue;

      const totalKg = calculateTotalKgFromCageData({ [cageKey]: cageInfo });

      // Track total (all-time)
      const currentTot = cageProduction.get(cageKey) || 0;
      cageProduction.set(cageKey, currentTot + totalKg);

      // Track by month bucket
      if (isCurrent) {
        const cur = cageCurrentProduction.get(cageKey) || 0;
        cageCurrentProduction.set(cageKey, cur + totalKg);
      } else {
        const prev = cagePrevProduction.get(cageKey) || 0;
        cagePrevProduction.set(cageKey, prev + totalKg);
      }
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

    // FIFO month-split: sales consume last month's production first
    const lastMonthProdKg = cagePrevProduction.get(cage) || 0;
    const currentMonthProdKg = cageCurrentProduction.get(cage) || 0;
    const soldFromLastMonth = Math.min(soldKg, lastMonthProdKg);
    const lastMonthStockKg = lastMonthProdKg - soldFromLastMonth;
    const currentMonthStockKg = currentMonthProdKg - (soldKg - soldFromLastMonth);

    result[cage] = {
      productionKg,
      soldKg,
      stockKg,
      stockPeti: Math.floor(stockKg / 15),
      lastMonthStockKg,
      lastMonthStockPeti: Math.floor(lastMonthStockKg / 15),
      lastMonthSisaKg: Math.round((lastMonthStockKg % 15) * 100) / 100,
      currentMonthStockKg,
      currentMonthStockPeti: Math.floor(currentMonthStockKg / 15),
      currentMonthSisaKg: Math.round((currentMonthStockKg % 15) * 100) / 100,
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
  pic?: string | null;
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

  // When updating, exclude self from totals to avoid double-counting
  const filteredEntries = data.id
    ? existingEntries.filter(e => e.id !== data.id)
    : existingEntries;

  const dailyTotals = calculateSalesTotals(filteredEntries, {
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
  jmlKandang?: number;
  jmlEmber?: number;
  jmlPakan?: number;
  gramEkor?: number;
  beratPakan?: number | null;
  volEmber?: number | null;
  hargaPakan?: number | null;
  faktorPakan?: number;
  doubleRows?: boolean;
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

// ==================== CAGE CHECK DATA ====================

export type SeatStatus = "PRODUCING" | "NOT_PRODUCING" | "EMPTY";

export type CageCheckInput = {
  date: Date;
  cageMasterId: string;
  checks: { baris: number; kolom: number; subPos: number; status: SeatStatus }[];
  cageMasterJmlAyam?: number;
};

/**
 * Fetch cage check state as of a given date (cumulative).
 * Returns the latest record per position with date <= selected date.
 * Missing positions = PRODUCING (default, never saved).
 */
export async function getCageCheckData(date: string, cageMasterId: string) {
  const checks = await prisma.cageCheck.findMany({
    where: { cageMasterId, date: { lte: new Date(date) } },
    orderBy: [{ baris: "asc" }, { kolom: "asc" }, { date: "desc" }],
  });

  // Deduplicate: keep only the latest record per position (most recent date)
  const seen = new Set<string>();
  const latest: typeof checks = [];
  for (const c of checks) {
    const key = `${c.baris}-${c.kolom}-${c.subPos}`;
    if (!seen.has(key)) {
      seen.add(key);
      latest.push(c);
    }
  }

  return latest;
}

/**
 * Save cage check — creates a NEW record for each changed position.
 * Every explicit user toggle creates a record.
 * Records are sparse: only positions the user actually changed get saved.
 * Missing records = PRODUCING (default).
 * If a record already exists for the same (date, position), it is replaced.
 * Also updates CageMaster.jmlAyam if cageMasterJmlAyam is provided.
 */
export async function saveCageCheckData(data: CageCheckInput) {
  const { date, cageMasterId, checks, cageMasterJmlAyam } = data;

  return await prisma.$transaction(async (tx) => {
    if (checks.length > 0) {
      // Delete any existing records for these positions on this date (in case of re-save)
      const orConditions = checks.map((c) => ({
        baris: c.baris,
        kolom: c.kolom,
        subPos: c.subPos,
      }));
      await tx.cageCheck.deleteMany({
        where: { date, cageMasterId, OR: orConditions },
      });

      await tx.cageCheck.createMany({
        data: checks.map((c) => ({
          date,
          cageMasterId,
          baris: c.baris,
          kolom: c.kolom,
          subPos: c.subPos,
          status: c.status,
        })),
      });
    }

    if (cageMasterJmlAyam !== undefined) {
      await tx.cageMaster.update({
        where: { id: cageMasterId },
        data: { jmlAyam: cageMasterJmlAyam },
      });
    }

    return { success: true, count: checks.length };
  });
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

/**
 * Delete sales data
 */
export async function deleteSalesData(id: string) {
  // Get the sale first to know its date for CashFlow sync
  const sale = await prisma.sales.findUnique({ where: { id } });
  if (!sale) return;

  await prisma.sales.delete({
    where: { id },
  });
  await recalculateStock();

  // Sync CashFlow: recalculate totalPenjualan for this date
  const remainingSales = await prisma.sales.findMany({
    where: { date: sale.date },
  });
  const totalRevenue = remainingSales.reduce((sum, s) => sum + (s.subTotal || 0), 0);

  const existingCashFlow = await prisma.cashFlow.findFirst({
    where: { date: sale.date }
  });

  if (existingCashFlow) {
    await prisma.cashFlow.update({
      where: { id: existingCashFlow.id },
      data: { totalPenjualan: totalRevenue }
    });
  } else {
    await prisma.cashFlow.create({
      data: {
        date: sale.date,
        totalPenjualan: totalRevenue,
      },
    });
  }

  revalidatePath("/");
}