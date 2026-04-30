"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWIBDateString } from "@/lib/date-utils";
import { InputField } from "@/components/InputField";
import {
  CageData,
  ProductionCageData,
  GlobalStats,
  initializeCageData,
  calculateGlobalStats,
} from "./types";

// Format number with thousand separators
function formatNumber(value: number | undefined | null | string): string {
  if (value == null) return "";
  if (typeof value === "string" && value === "") return "";
  // Allow partial decimal input (e.g. "7.", ".") to display while typing
  if (typeof value === "string" && /^\d*\.?\d*$/.test(value) && (value.endsWith(".") || value === ".")) {
    return value;
  }
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-US");
}

type ProductionFormProps = {
  data: any;
  originalData?: any;
  setData: (data: any) => void;
  isEditable: boolean;
  date: string;
  stockData?: any[];
  salesData?: any[];
};

export function ProductionForm({ data, originalData, setData, isEditable, date, stockData = [], salesData = [] }: ProductionFormProps) {
  const [cages, setCages] = useState<{ kandang: string }[]>([]);
  const [loadingCages, setLoadingCages] = useState(true);
  const today = getWIBDateString();
  const isToday = date === today;
  const formattedDate = new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const headerTitle = isToday ? "Total Hari Ini" : `Total ${formattedDate}`;

  useEffect(() => {
    async function fetchCages() {
      try {
        const res = await fetch("/api/master");
        if (res.ok) {
          const cageData = await res.json();
          setCages(cageData || []);
        }
      } catch (err) {
        console.error("Failed to fetch cages:", err);
      } finally {
        setLoadingCages(false);
      }
    }
    fetchCages();
  }, []);

  const getCageData = (key: string): CageData => {
    const cageData = data.cageData?.[key];
    if (!cageData) {
      return initializeCageData(key);
    }
    return cageData;
  };

  // Calculate cumulative production stats: just cumulative from database (no adding current unsaved entry)
  // This calculates the current all-time cumulative production from stockData
  const netStats: GlobalStats = useMemo(() => {
    let totalKg = 0;
    cages.forEach((cage) => {
      const stock = stockData.find((s: any) => s.kandang === cage.kandang);
      // Use cumulative PRODUCTION instead of stock
      totalKg += stock?.productionKg || 0;
    });
    return {
      totalKg,
      totalPeti: Math.floor(totalKg / 15),
      totalTray: 0,
      totalButir: 0,
      totalSisaKg: totalKg % 15,
    };
  }, [cages, stockData]);

  // Helper to get net stock for a specific cage (only from DB)
  const getCageNetStock = (kandang: string) => {
    const stock = stockData.find((s: any) => s.kandang === kandang);
    const totalKg = stock?.stockKg || 0;
    return {
      kg: totalKg,
      peti: stock?.stockPeti || 0,
      sisaKg: totalKg % 15,
    };
  };

  const globalStats: GlobalStats = calculateGlobalStats(cages, getCageData);

  // Detect if user has unsaved changes (compares current data with original)
  const hasUnsavedChanges = useMemo(() => {
    if (!originalData) return false;
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  // Calculate stats for the baseline (original) data
  const originalGlobalStats: GlobalStats = useMemo(() => {
    return calculateGlobalStats(cages, (key) => originalData?.cageData?.[key] || initializeCageData(key));
  }, [cages, originalData]);

  // DB cumulative production for this date (stored in production record)
  const dbProductionKg = data.productionKg || 0;

  // Calculate display stats (Live YTD Production)
  const displayStats = useMemo(() => {
    const baseKg = dbProductionKg || netStats.totalKg;
    const currentKg = hasUnsavedChanges
      ? baseKg - (originalGlobalStats.totalKg || 0) + globalStats.totalKg
      : baseKg;
    
    return {
      totalKg: currentKg,
      totalPeti: Math.floor(currentKg / 15),
      totalSisaKg: currentKg % 15,
      totalButir: hasUnsavedChanges ? globalStats.totalButir : (data.totalButir || 0) // Butir is usually just for today
    };
  }, [dbProductionKg, netStats.totalKg, hasUnsavedChanges, originalGlobalStats.totalKg, globalStats.totalKg, globalStats.totalButir, data.totalButir]);

  const updatePeti = (key: string, rowIndex: number, checked: boolean) => {
    if (!isEditable) return;

    const cageInfo = getCageData(key);

    // Just toggle the peti checkbox - does NOT modify extraKg
    // The 15kg contribution is calculated silently in calculateGlobalStats
    const updatedCageInfo: CageData = {
      ...cageInfo,
      rows: cageInfo.rows.map((r, i) =>
        i === rowIndex ? { ...r, peti: checked } : r
      ),
    };

    setData({
      ...data,
      cageData: { ...data.cageData, [key]: updatedCageInfo },
    });
  };

  const updateRowField = (
    key: string,
    rowIndex: number,
    field: "tray" | "butir",
    value: string
  ) => {
    if (!isEditable) return;

    const val = parseInt(value) || 0;
    const cageInfo = getCageData(key);

    const updatedCageInfo: CageData = {
      ...cageInfo,
      rows: cageInfo.rows.map((r, i) =>
        i === rowIndex ? { ...r, [field]: val } : r
      ),
    };

    setData({
      ...data,
      cageData: { ...data.cageData, [key]: updatedCageInfo },
    });
  };

  const updateExtraField = (
    key: string,
    field: "extraTray" | "extraButir" | "extraKg",
    value: string
  ) => {
    if (!isEditable) return;

    // For extraKg, store whatever user types (allows partial input like "7." or ".")
    // For others, parse as integer
    const val = field === "extraKg" 
      ? (value === "" ? "" : value)  // keep string as-is for display
      : (parseInt(value) || 0);
      
    const cageInfo = getCageData(key);

    const updatedCageInfo: CageData = {
      ...cageInfo,
      extra: { ...cageInfo.extra, [field]: val },
    };

    setData({
      ...data,
      cageData: { ...data.cageData, [key]: updatedCageInfo },
    });
  };

  const updateField = (field: string, val: string) => {
    if (!isEditable) return;
    const cleaned = val.replace(/,/g, "");
    setData({ ...data, [field]: parseFloat(cleaned) || 0 });
  };

  const renderCageCard = (cage: { kandang: string }) => {
    const key = cage.kandang;
    const cageInfo = getCageData(key);
    const netStock = getCageNetStock(key);

    return (
      <div
        key={key}
        className="bg-white md:p-8 p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="md:w-14 md:h-14 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black md:text-lg text-base">
              {key}
            </div>
            <div>
              <h3 className="md:text-2xl text-xl font-black text-slate-900">Kandang {key}</h3>
              {netStock.peti > 0 && (
                <span className="text-xs font-bold text-blue-600">{netStock.peti} peti available</span>
              )}
            </div>
          </div>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-2 gap-3 mb-4 ml-9 md:text-sm text-xs font-black uppercase tracking-wider text-slate-400">
          <div className="text-center">Tray</div>
          <div className="text-center">Butir</div>
        </div>

        {/* 3 data rows */}
        <div className="space-y-3 md:space-y-4">
          {cageInfo.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2 mb-3">
              <button
                onClick={() => updatePeti(key, rowIndex, !row.peti)}
                disabled={!isEditable}
                className={`md:w-8 md:h-8 w-7 h-7 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                  row.peti ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                } ${!isEditable ? "cursor-not-allowed" : "hover:bg-slate-200"}`}
              >
                {row.peti && <CheckCircle2 className="md:w-5 md:h-5 w-4 h-4" />}
              </button>

              {/* Tray + Butir inputs now share all remaining space */}
              <div className="grid grid-cols-2 gap-2 flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(row.tray)}
                  onChange={(e) => updateRowField(key, rowIndex, "tray", e.target.value.replace(/,/g, ""))}
                  disabled={!isEditable}
                  placeholder="0"
                  className={`md:px-4 md:py-4 px-3 py-3 rounded-xl text-center font-black md:text-lg text-base w-full ${
                    isEditable
                      ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      : "bg-slate-50 border border-slate-100 text-slate-600"
                  } ${!isEditable ? " cursor-not-allowed" : ""}`}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(row.butir)}
                  onChange={(e) => updateRowField(key, rowIndex, "butir", e.target.value.replace(/,/g, ""))}
                  disabled={!isEditable}
                  placeholder="0"
                  className={`md:px-4 md:py-4 px-3 py-3 rounded-xl text-center font-black md:text-lg text-base w-full ${
                    isEditable
                      ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      : "bg-slate-50 border border-slate-100 text-slate-600"
                  } ${!isEditable ? " cursor-not-allowed" : ""}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Extra/footer row */}
        <div className="mt-6 md:mt-8 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="md:text-sm text-xs uppercase font-black tracking-wider block mb-2 md:mb-3 text-slate-400">
                +Tray
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formatNumber(cageInfo.extra?.extraTray)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/,/g, "");
                  updateExtraField(key, "extraTray", cleaned);
                }}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full md:px-4 md:py-4 px-3 py-3 rounded-xl font-black md:text-lg text-base ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-600"
                } ${!isEditable ? " cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="md:text-sm text-xs uppercase font-black tracking-wider block mb-2 md:mb-3 text-slate-400">
                +Butir
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formatNumber(cageInfo.extra?.extraButir)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/,/g, "");
                  updateExtraField(key, "extraButir", cleaned);
                }}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full md:px-4 md:py-4 px-3 py-3 rounded-xl font-black md:text-lg text-base ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-600"
                } ${!isEditable ? " cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="md:text-sm text-xs uppercase font-black tracking-wider block mb-2 md:mb-3 text-slate-400">
                +Kg
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formatNumber(cageInfo.extra?.extraKg)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/,/g, "");
                  updateExtraField(key, "extraKg", cleaned);
                }}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full md:px-4 md:py-4 px-3 py-3 rounded-xl font-black md:text-lg text-base ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-600"
                } ${!isEditable ? " cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loadingCages) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stat Card - Stock from DB + Conditional Entry */}
      <div className="bg-slate-900 md:p-8 p-5 rounded-2xl text-white">
        <h3 className="md:text-xl text-base font-black mb-5 md:mb-6 text-slate-400 uppercase tracking-wider">{headerTitle}</h3>
        
        {/* Row 1: STOCK - Always shown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div className="bg-slate-800/50 md:p-6 p-4 rounded-xl text-center">
            <div className={cn("md:text-4xl text-2xl font-black", hasUnsavedChanges && "text-blue-400")}>
              {formatNumber(hasUnsavedChanges ? globalStats.totalButir : (data.totalButir || 0))}
            </div>
            <div className="md:text-sm text-[11px] uppercase font-medium text-slate-400">Butir (Hari Ini)</div>
          </div>
          <div className="bg-slate-800/50 md:p-6 p-4 rounded-xl text-center">
            <div className={cn("md:text-4xl text-2xl font-black", hasUnsavedChanges && "text-blue-400")}>
              {formatNumber(displayStats.totalKg)}
            </div>
            <div className="md:text-sm text-[11px] uppercase font-medium text-slate-400">Total Produksi (Kg)</div>
          </div>
          <div className="bg-slate-800/50 md:p-6 p-4 rounded-xl text-center">
            <div className={cn("md:text-4xl text-2xl font-black", hasUnsavedChanges && "text-blue-400")}>
              {formatNumber(displayStats.totalPeti)}
            </div>
            <div className="md:text-sm text-[11px] uppercase font-medium text-slate-400">Total Produksi (Peti)</div>
          </div>
          <div className="bg-slate-800/50 md:p-6 p-4 rounded-xl text-center">
            <div className={cn("md:text-4xl text-2xl font-black", hasUnsavedChanges && "text-blue-400")}>
              {formatNumber(displayStats.totalSisaKg)}
            </div>
            <div className="md:text-sm text-[11px] uppercase font-medium text-slate-400">Sisa Kg (YTD)</div>
          </div>
        </div>
      </div>

      {/* Cage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cages.map((cage) => renderCageCard(cage))}
      </div>
    </div>
  );
}