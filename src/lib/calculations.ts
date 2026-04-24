/**
 * Calculation utilities for SAP Reform
 * Centralizes all math logic for Production, Sales, and CashFlow
 */
import { getWIBDateString } from "@/lib/date-utils";

// ==================== CAGE MASTER CALCULATIONS ====================

export type CageMasterInput = {
  jmlAyam: number;
  jmlEmber: number;
  jmlPakan: number;
  hargaPakan?: number;
};

/**
 * Calculate derived fields from CageMaster input
 * G/Ekor (gram per chicken) = Jml Pakan / Jml Ayam
 */
export function calculateGramEkor(input: CageMasterInput): number {
  if (!input.jmlAyam || input.jmlAyam === 0) return 0;
  return input.jmlPakan / input.jmlAyam;
}

/**
 * B Pakan (total feed cost) = Jml Pakan * H. Pakan
 */
export function calculateBeratPakan(input: CageMasterInput): number {
  const harga = input.hargaPakan ?? 0;
  return input.jmlPakan * harga;
}

/**
 * Vol/Ember (volume per bucket) = Jml Pakan / Jml Ember
 */
export function calculateVolEmber(input: CageMasterInput): number {
  if (!input.jmlEmber || input.jmlEmber === 0) return 0;
  return input.jmlPakan / input.jmlEmber;
}

/**
 * Calculate all derived fields for CageMaster
 */
export function calculateCageMasterFields(input: CageMasterInput) {
  return {
    gramEkor: calculateGramEkor(input),
    beratPakan: calculateBeratPakan(input),
    volEmber: calculateVolEmber(input),
  };
}

// ==================== PRODUCTION CALCULATIONS ====================

/**
 * Calculate totalKg from the new JSON-based cageData structure
 */
export function calculateTotalKgFromCageData(cageData: Record<string, any>): number {
  if (!cageData) return 0;
  
  return Object.values(cageData).reduce((sum: number, cage: any) => {
    if (!cage?.footer?.totalKg) return sum;
    return sum + (cage.footer.totalKg || 0);
  }, 0);
}

/**
 * Calculate totalJmlTelur (total eggs) from cageData
 */
export function calculateTotalJmlTelurFromCageData(cageData: Record<string, any>): number {
  if (!cageData) return 0;
  
  return Object.values(cageData).reduce((sum: number, cage: any) => {
    if (!cage?.footer?.totalButir) return sum;
    return sum + (cage.footer.totalButir || 0);
  }, 0);
}

export function calculateProductionTotals(data: {
  cageData?: Record<string, any>;
}) {
  return {
    totalKg: calculateTotalKgFromCageData(data.cageData || {}),
    totalJmlTelur: calculateTotalJmlTelurFromCageData(data.cageData || {}),
  };
}

export function calculateProductionStats(entries: any[]) {
  const totalKg = entries.reduce((sum, e) => {
    return sum + calculateTotalKgFromCageData(e.cageData);
  }, 0);
  const avgKg = entries.length > 0 ? totalKg / entries.length : 0;
  
  // Filter for today's production (00:00-23:59 WIB)
  const today = getWIBDateString();
  const todayEntries = entries.filter(e => e.date && getWIBDateString(e.date) === today);
  const todayKg = todayEntries.reduce((sum, e) => {
    return sum + calculateTotalKgFromCageData(e.cageData);
  }, 0);
  
  return { totalKg, avgKg, todayKg };
}

// ==================== SALES CALCULATIONS ====================

export function calculateSalesRevenue(totalKg: number, hargaJual: number) {
  return totalKg * hargaJual;
}

export function calculateSalesTotals(
  existingEntries: any[], 
  newData: { totalKg?: number; jmlPeti?: number; hargaJual?: number }
) {
  const existingKg = existingEntries.reduce((sum, e) => sum + (e.totalKg || 0), 0);
  const existingPeti = existingEntries.reduce((sum, e) => sum + (e.jmlPeti || 0), 0);
  const existingRevenue = existingEntries.reduce((sum, e) => sum + (e.subTotal || 0), 0);
  
  const newKg = newData.totalKg || 0;
  const newPeti = newData.jmlPeti || 0;
  const newRevenue = calculateSalesRevenue(newKg, newData.hargaJual || 0);
  
  return {
    totalKgHariIni: existingKg + newKg,
    totalPetiHariIni: existingPeti + newPeti,
    penjualanHariIni: existingRevenue + newRevenue,
  };
}

export function calculateSalesStats(entries: any[]) {
  const totalKg = entries.reduce((sum, e) => sum + (e.totalKg || 0), 0);
  const totalRevenue = entries.reduce((sum, e) => sum + (e.subTotal || 0), 0);
  const totalPeti = entries.reduce((sum, e) => sum + (e.jmlPeti || 0), 0);
  
  const today = getWIBDateString();
  const todayEntries = entries.filter(e => e.date && getWIBDateString(e.date) === today);
  const todayKg = todayEntries.reduce((sum, e) => sum + (e.totalKg || 0), 0);
  const todayPeti = todayEntries.reduce((sum, e) => sum + (e.jmlPeti || 0), 0);
    
  return { totalKg, totalRevenue, totalPeti, todayKg, todayPeti };
}

// ==================== CASHFLOW CALCULATIONS ====================

export function calculateCashFlowExpenses(data: {
  biayaPakan?: number;
  biayaOperasional?: number;
  salaries?: Record<string, number>;
  devidenA?: number;
  devidenB?: number;
}) {
  // Calculate total salaries from the salaries object
  const salariesTotal = data.salaries 
    ? Object.values(data.salaries).reduce((sum, salary) => sum + (salary || 0), 0)
    : 0;
  
  const expenses = 
    (data.biayaPakan || 0) + 
    (data.biayaOperasional || 0) + 
    salariesTotal +
    (data.devidenA || 0) + 
    (data.devidenB || 0);
    
  return expenses;
}

export function calculateCashFlowProfit(data: {
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
  salaries?: Record<string, number>;
  // Legacy fields - kept for backward compatibility
  // gajiBepuk?: number;
  // gajiBarman?: number;
  // gajiAgung?: number;
  // gajiEki?: number;
  // gajiAdi?: number;
  devidenA?: number;
  devidenB?: number;
}) {
  const revenue = data.totalPenjualan || 0;
  
  // Calculate total salaries from new dynamic structure
  const salariesTotal = data.salaries 
    ? Object.values(data.salaries).reduce((sum, salary) => sum + (salary || 0), 0)
    : 0;
  
  // Fall back to legacy fields if no new salaries provided
  // const legacySalaries = 
  //   (data.gajiBepuk || 0) + 
  //   (data.gajiBarman || 0) + 
  //   (data.gajiAgung || 0) + 
  //   (data.gajiEki || 0) + 
  //   (data.gajiAdi || 0);
  
  // const totalSalaries = salariesTotal;
  
  const expenses = calculateCashFlowExpenses({
    biayaPakan: data.biayaPakan,
    biayaOperasional: data.biayaOperasional,
    devidenA: data.devidenA,
    devidenB: data.devidenB,
    salaries: data.salaries,
  });

  return revenue - expenses;
}

export function calculateCashFlowStats(entries: any[]) {
  const totalProfit = entries.reduce((sum, e) => 
    sum + calculateCashFlowProfit(e), 0);
  const totalExpenses = entries.reduce((sum, e) => 
    sum + calculateCashFlowExpenses(e), 0);
  const avgProfit = entries.length > 0 ? totalProfit / entries.length : 0;
  
  // Get today's date in WIB
  const today = getWIBDateString();
  const todayEntries = entries.filter(e => e.date && getWIBDateString(e.date) === today);
  const todayExpenses = todayEntries.reduce((sum, e) => 
    sum + calculateCashFlowExpenses(e), 0);
  
  // Get this month's entries (calendar month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const monthEntries = entries.filter(e => {
    if (!e.date) return false;
    const entryDate = new Date(e.date);
    return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
  });
  const monthExpenses = monthEntries.reduce((sum, e) => 
    sum + calculateCashFlowExpenses(e), 0);
  
  // Total Liquid Assets = saldoRekening (saldoKas in DB) + saldoCash
  const latest = entries[0] || {};
  const saldoRekening = latest.saldoKas || 0;
  const saldoCash = latest.saldoCash || 0;
  const totalLiquidAssets = saldoRekening + saldoCash;
  
  return { totalProfit, totalExpenses, avgProfit, todayExpenses, monthExpenses, totalLiquidAssets, saldoRekening, saldoCash };
}

// ==================== COMBINED DASHBOARD STATS ====================

export function calculateDashboardStats(
  productionEntries: any[],
  cashFlowEntries: any[],
  salesEntries: any[]
) {
  const prodStats = calculateProductionStats(productionEntries);
  const cashStats = calculateCashFlowStats(cashFlowEntries);
  const salesStats = calculateSalesStats(salesEntries);
  
  return {
    // Production
    productionTotalKg: prodStats.totalKg,
    productionAvgKg: prodStats.avgKg,
    productionLatestKg: prodStats.todayKg,
    // Sales
    salesTotalKg: salesStats.totalKg,
    salesTotalRevenue: salesStats.totalRevenue,
    salesTotalPeti: salesStats.totalPeti,
    salesTodayKg: salesStats.todayKg,
    salesTodayPeti: salesStats.todayPeti,
    // CashFlow
    cashFlowTotalProfit: cashStats.totalProfit,
    cashFlowAvgProfit: cashStats.avgProfit,
    cashFlowTotalExpenses: cashStats.totalExpenses,
    cashFlowTodayExpenses: cashStats.todayExpenses,
    cashFlowMonthExpenses: cashStats.monthExpenses,
    cashFlowTotalLiquidAssets: cashStats.totalLiquidAssets,
    cashFlowSaldoRekening: cashStats.saldoRekening,
    cashFlowSaldoCash: cashStats.saldoCash,
  };
}