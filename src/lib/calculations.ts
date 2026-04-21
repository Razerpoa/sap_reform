/**
 * Calculation utilities for SAP Reform
 * Centralizes all math logic for Production, Sales, and CashFlow
 */
import { getWIBDateString } from "@/lib/date-utils";

// ==================== PRODUCTION CALCULATIONS ====================

export function calculateProductionTotals(data: {
  b1Kg?: number;
  b1pKg?: number;
  b2Kg?: number;
  b2pKg?: number;
  b3Kg?: number;
  b3pKg?: number;
  b1JmlTelur?: number;
  b1pJmlTelur?: number;
  b2JmlTelur?: number;
  b2pJmlTelur?: number;
  b3JmlTelur?: number;
  b3pJmlTelur?: number;
}) {
  return {
    totalKg: 
      (data.b1Kg || 0) + (data.b1pKg || 0) + 
      (data.b2Kg || 0) + (data.b2pKg || 0) + 
      (data.b3Kg || 0) + (data.b3pKg || 0),
    totalJmlTelur: 
      (data.b1JmlTelur || 0) + (data.b1pJmlTelur || 0) + 
      (data.b2JmlTelur || 0) + (data.b2pJmlTelur || 0) + 
      (data.b3JmlTelur || 0) + (data.b3pJmlTelur || 0),
  };
}

export function calculateProductionStats(entries: any[]) {
  const totalKg = entries.reduce((sum, e) => sum + (e.totalKg || 0), 0);
  const avgKg = entries.length > 0 ? totalKg / entries.length : 0;
  
  // Filter for today's production (00:00-23:59 WIB)
  const today = getWIBDateString();
  const todayEntries = entries.filter(e => e.date && getWIBDateString(e.date) === today);
  const todayKg = todayEntries.reduce((sum, e) => sum + (e.totalKg || 0), 0);
  
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