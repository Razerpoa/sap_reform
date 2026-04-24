"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { InputField } from "@/components/InputField";
import {
  CageData,
  ProductionCageData,
  GlobalStats,
  initializeCageData,
  calculateGlobalStats,
} from "./types";

type ProductionFormProps = {
  data: any;
  setData: (data: any) => void;
  isEditable: boolean;
};

export function ProductionForm({ data, setData, isEditable }: ProductionFormProps) {
  const [cages, setCages] = useState<{ kandang: string }[]>([]);
  const [loadingCages, setLoadingCages] = useState(true);

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

  const globalStats: GlobalStats = calculateGlobalStats(cages, getCageData);

  const updatePeti = (key: string, rowIndex: number, checked: boolean) => {
    if (!isEditable) return;

    const cageInfo = getCageData(key);
    const currentKg = Number(cageInfo.extra?.extraKg) || 0;
    const newKg = checked ? currentKg + 15 : Math.max(0, currentKg - 15);

    const updatedCageInfo: CageData = {
      ...cageInfo,
      rows: cageInfo.rows.map((r, i) =>
        i === rowIndex ? { ...r, peti: checked } : r
      ),
      extra: { ...cageInfo.extra, extraKg: newKg },
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

    const val = field === "extraKg" ? parseFloat(value) || 0 : parseInt(value) || 0;
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
    setData({ ...data, [field]: parseFloat(val) || 0 });
  };

  const renderCageCard = (cage: { kandang: string }) => {
    const key = cage.kandang;
    const cageInfo = getCageData(key);

return (
      <div
        key={key}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
              {key}
            </div>
            <h3 className="text-base font-black text-slate-900">Kandang {key}</h3>
          </div>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-[8px] font-black uppercase tracking-wider text-slate-400">
          <div></div>
          <div className="text-center">Tray</div>
          <div className="text-center">Butir</div>
          <div></div>
        </div>

        {/* 3 data rows */}
        <div className="space-y-3">
          {cageInfo.rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-4 gap-3 items-center"
            >
              <div className="flex items-center justify-center">
                <button
                  onClick={() => updatePeti(key, rowIndex, !row.peti)}
                  disabled={!isEditable}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    row.peti
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                  } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {row.peti && <CheckCircle2 className="w-3 h-3" />}
                </button>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={row.tray || ""}
                onChange={(e) => updateRowField(key, rowIndex, "tray", e.target.value)}
                disabled={!isEditable}
                placeholder="0"
                className={`px-2 py-2 rounded text-center font-black text-xs ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-400"
                } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <input
                type="number"
                inputMode="numeric"
                value={row.butir || ""}
                onChange={(e) => updateRowField(key, rowIndex, "butir", e.target.value)}
                disabled={!isEditable}
                placeholder="0"
                className={`px-2 py-2 rounded text-center font-black text-xs ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-400"
                } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <div className="text-[8px] font-medium text-slate-300 text-right pr-1">
                Row {rowIndex + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Extra/footer row */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[8px] uppercase font-black tracking-wider block mb-1.5 text-slate-400">
                +Tray
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cageInfo.extra?.extraTray || ""}
                onChange={(e) => updateExtraField(key, "extraTray", e.target.value)}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full px-2 py-2 rounded font-black text-xs ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-400"
                } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="text-[8px] uppercase font-black tracking-wider block mb-1.5 text-slate-400">
                +Butir
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cageInfo.extra?.extraButir || ""}
                onChange={(e) => updateExtraField(key, "extraButir", e.target.value)}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full px-2 py-2 rounded font-black text-xs ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-400"
                } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="text-[8px] uppercase font-black tracking-wider block mb-1.5 text-slate-400">
                +Kg
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cageInfo.extra?.extraKg || ""}
                onChange={(e) => updateExtraField(key, "extraKg", e.target.value)}
                disabled={!isEditable}
                placeholder="0"
                className={`w-full px-2 py-2 rounded font-black text-xs ${
                  isEditable
                    ? "bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    : "bg-slate-50 border border-slate-100 text-slate-400"
                } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
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
      {/* Global Stat Card */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white">
        <h3 className="text-sm font-black mb-5 text-slate-400 uppercase tracking-wider">Total Hari Ini</h3>
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-slate-800/50 rounded-xl p-5 text-center">
            <div className="text-2xl font-black">{globalStats.totalKg}</div>
            <div className="text-[10px] uppercase font-medium text-slate-400">Kg</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 text-center">
            <div className="text-2xl font-black">{globalStats.totalTray}</div>
            <div className="text-[10px] uppercase font-medium text-slate-400">Tray</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 text-center">
            <div className="text-2xl font-black">{globalStats.totalButir}</div>
            <div className="text-[10px] uppercase font-medium text-slate-400">Butir</div>
          </div>
        </div>
      </div>

      {/* Daily Financial Summary */}
      <div className="bg-blue-600 p-6 rounded-2xl text-white">
        <h3 className="text-sm font-black mb-5 text-white/70 uppercase tracking-wider">Ringkasan Keuangan</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <InputField dark label="Harga Sentral" value={data.hargaSentral} onChange={(v: string) => updateField(`hargaSentral`, v)} readOnly={!isEditable} />
          <InputField dark label="UP" value={data.up} onChange={(v: string) => updateField(`up`, v)} readOnly={!isEditable} />
          <InputField dark label="Operasional" value={data.operasional} onChange={(v: string) => updateField(`operasional`, v)} readOnly={!isEditable} />
          <InputField dark label="Daily Profit" value={data.profitDaily} onChange={(v: string) => updateField(`profitDaily`, v)} readOnly={!isEditable} />
        </div>
      </div>

      {/* Cage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cages.map((cage) => renderCageCard(cage))}
      </div>
    </div>
  );
}