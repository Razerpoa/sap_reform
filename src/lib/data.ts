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
    const date = startOfDay(new Date(options.date));
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
    const date = startOfDay(new Date(options.date));
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
    const date = startOfDay(new Date(options.date));
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
    orderBy: { name: "asc" },
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