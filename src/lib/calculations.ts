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
  const latestKg = entries[0]?.totalKg || 0;
  return { totalKg, avgKg, latestKg };
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
  const todayKg = entries
    .filter(e => e.date && getWIBDateString(e.date) === today)
    .reduce((sum, e) => sum + (e.totalKg || 0), 0);
    
  return { totalKg, totalRevenue, totalPeti, todayKg };
}

// ==================== CASHFLOW CALCULATIONS ====================

export function calculateCashFlowProfit(data: {
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
}) {
  return (data.totalPenjualan || 0) - (data.biayaPakan || 0) - (data.biayaOperasional || 0);
}

export function calculateCashFlowStats(entries: any[]) {
  const totalProfit = entries.reduce((sum, e) => 
    sum + calculateCashFlowProfit(e), 0);
  const avgProfit = entries.length > 0 ? totalProfit / entries.length : 0;
  const latestCash = entries[0]?.saldoCash || 0;
  return { totalProfit, avgProfit, latestCash };
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
    productionLatestKg: prodStats.latestKg,
    // Sales
    salesTotalKg: salesStats.totalKg,
    salesTotalRevenue: salesStats.totalRevenue,
    salesTotalPeti: salesStats.totalPeti,
    salesTodayKg: salesStats.todayKg,
    // CashFlow
    cashFlowTotalProfit: cashStats.totalProfit,
    cashFlowAvgProfit: cashStats.avgProfit,
    cashFlowLatestCash: cashStats.latestCash,
  };
}