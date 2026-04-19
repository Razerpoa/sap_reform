"use client";

import { useState } from "react";
import { TrendingUp, Package, Layers, DollarSign, Wallet, ShoppingBag, TrendingDown, Landmark, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Charts, { Sparkline } from "@/components/Charts";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
  stats: {
    salesTotalRevenue: number;
    salesTotalKg: number;
    salesTotalPeti: number;
    productionLatestKg: number;
    productionAvgKg: number;
    salesTodayKg: number;
    salesTodayPeti: number;
    cashFlowTotalProfit: number;
    cashFlowAvgProfit: number;
    cashFlowTotalLiquidAssets: number;
    cashFlowSaldoRekening: number;
    cashFlowSaldoCash: number;
  };
  hasProductionToday: boolean;
  chartData: any[];
  salesEntries: any[];
  productionEntries: any[];
  cashFlowEntries: any[];
}

export function DashboardClient({
  stats,
  hasProductionToday,
  chartData,
  salesEntries,
  productionEntries,
  cashFlowEntries
}: DashboardClientProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-32">
      {!hasProductionToday && (
        <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Belum ada data masuk hari ini</h2>
              <p className="text-blue-100 font-medium italic">Produksi adalah jantung peternakan. Mulai mencatat?</p>
            </div>
          </div>
          <Link
            href="/entry"
            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 whitespace-nowrap"
          >
            Mulai Mencatat
          </Link>
        </div>
      )}

      {/* Stats Section */}
      <div className="space-y-6">
        <PremiumStatCard
          variant="hero"
          title="Kinerja Penjualan"
          value={`Rp ${Math.round(stats.salesTotalRevenue || 0).toLocaleString()}`}
          subtitle="Total Pendapatan (30h)"
          icon={DollarSign}
          color="bg-amber-500"
          trendData={salesEntries.slice(0, 7).reverse().map((e: any) => e.subTotal)}
          breakdown={[
            { label: "Total Volume", value: `${(stats.salesTotalKg || 0).toLocaleString()} KG`, icon: ShoppingBag },
            { label: "Total Peti", value: `${(stats.salesTotalPeti || 0).toLocaleString()} Peti`, icon: Layers }
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <PremiumStatCard
            variant="compact"
            title="Produksi Hari ini"
            value={`${(stats.productionLatestKg || 0).toLocaleString()} KG`}
            subtitle="Produksi"
            icon={Layers}
            color="bg-indigo-600"
            trendData={productionEntries.slice(0, 7).reverse().map((e: any) => e.totalKg)}
            breakdown={[
              { label: "Avg (30h)", value: `${Math.round(stats.productionAvgKg || 0).toLocaleString()} KG`, icon: Package }
            ]}
          />
          <PremiumStatCard
            variant="compact"
            title="Aktivitas"
            value={`${(stats.salesTodayKg || 0).toLocaleString()} KG`}
            subtitle="Terjual"
            icon={TrendingUp}
            color="bg-emerald-600"
            trendData={salesEntries.slice(0, 7).reverse().map((e: any) => e.totalKgHariIni)}
            breakdown={[
              { label: "Peti Hari Ini", value: `${(stats.salesTodayPeti || 0).toLocaleString()} Peti`, icon: Layers }
            ]}
          />
          <PremiumStatCard
            variant="compact"
            title="Ringkasan Profit"
            value={`Rp ${Math.round(stats.cashFlowTotalProfit || 0).toLocaleString()}`}
            subtitle="Profit (30h)"
            icon={TrendingDown}
            color="bg-rose-600"
            trendData={cashFlowEntries.slice(0, 7).reverse().map((e: any) => e.totalPenjualan - e.biayaPakan - e.biayaOperasional)}
            breakdown={[
              { label: "Avg Profit", value: `Rp ${Math.round(stats.cashFlowAvgProfit || 0).toLocaleString()}`, icon: DollarSign }
            ]}
          />
          <PremiumStatCard
            variant="compact"
            title="Saldo"
            value={`Rp ${Math.round(stats.cashFlowTotalLiquidAssets || 0).toLocaleString()}`}
            subtitle="Live Balance"
            icon={Wallet}
            color="bg-blue-600"
            trendData={cashFlowEntries.slice(0, 7).reverse().map((e: any) => e.saldoRekening + e.saldoCash)}
            breakdown={[
              { label: "Rekening", value: `Rp ${Math.round(stats.cashFlowSaldoRekening || 0).toLocaleString()}`, icon: Landmark },
              { label: "Cash", value: `Rp ${Math.round(stats.cashFlowSaldoCash || 0).toLocaleString()}`, icon: DollarSign }
            ]}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tren Produksi</h3>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-blue-600"></div>
               <span className="text-xs font-bold text-slate-400">Total KG</span>
            </div>
          </div>
          <div className="h-80 w-full min-h-[320px]">
            <Charts data={chartData} type="production" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kinerja Keuangan</h3>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profit</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expenses</span>
               </div>
            </div>
          </div>
          <div className="h-80 w-full min-h-[320px]">
            <Charts data={chartData} type="finance" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PremiumStatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  breakdown?: { label: string; value: string; icon: any }[];
  variant: "hero" | "compact";
  trendData?: number[];
}

function PremiumStatCard({ title, value, subtitle, icon: Icon, color, breakdown, variant, trendData }: PremiumStatCardProps) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const getValueFontSize = (val: string) => {
    const len = val.length;
    if (isHero) {
      if (len > 22) return "text-3xl sm:text-5xl";
      if (len > 18) return "text-4xl sm:text-6xl";
      return "text-5xl sm:text-7xl";
    }
    if (len > 15) return "text-lg sm:text-2xl";
    if (len > 12) return "text-xl sm:text-3xl";
    return "text-2xl sm:text-4xl";
  };

  const colorMatch = color.match(/bg-([a-z]+)-/);
  const colorName = colorMatch ? colorMatch[1] : "slate";
  const badgeText = colorName === "slate" ? "text-slate-400" : `text-${colorName}-400`;
  const badgeBg = colorName === "slate" ? "bg-slate-800/50" : `bg-${colorName}-500/10`;
  const badgeRing = colorName === "slate" ? "ring-white/5" : `ring-${colorName}-500/20`;
  const trendColor = colorName === "slate" ? "#94a3b8" :
                     colorName === "amber" ? "#f59e0b" :
                     colorName === "indigo" ? "#6366f1" :
                     colorName === "emerald" ? "#10b981" :
                     colorName === "rose" ? "#f43f5e" :
                     colorName === "blue" ? "#3b82f6" : "#3b82f6";

  return (
    <div className={cn(
      "group bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-2 hover:border-slate-700 transition-all text-white overflow-hidden relative animate-in fade-in zoom-in-95 rounded-[32px] p-5 sm:p-9",
      isHero ? "p-10 sm:p-14 mb-2" : ""
    )}>
      <div className={`absolute -top-10 -right-10 w-48 h-48 ${color.replace('bg-', 'bg-')}/20 rounded-full blur-[60px] group-hover:blur-[80px] group-hover:scale-125 transition-all duration-500 opacity-30`}></div>

      <div className={cn("flex items-start justify-between relative z-10", isCompact ? "mb-4" : "mb-8")}>
        <div className={cn(
          color,
          "rounded-[16px] shadow-lg ring-4 ring-slate-800 group-hover:scale-110 transition-transform duration-300",
          isCompact ? "p-3 sm:p-5" : "p-6"
        )}>
          <Icon className={cn("text-white", isCompact ? "w-5 h-5 sm:w-8 sm:h-8" : "w-10 h-10")} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={cn(
            "font-black uppercase tracking-widest rounded-full ring-1 transition-all duration-300",
            badgeText, badgeBg, badgeRing,
            isCompact ? "text-[8px] px-2 py-1" : "text-[10px] px-4 py-2"
          )}>
            {subtitle}
          </span>
          {hoveredValue !== null && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-jetbrains font-bold">Rp {Math.round(hoveredValue).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className={cn("relative z-10", isCompact ? "mb-6" : "mb-8")}>
        <p className={cn("font-black uppercase tracking-[0.2em] text-slate-500 mb-1", isCompact ? "text-[8px] sm:text-[11px]" : "text-[11px]")}>{title}</p>
        <h4 className={cn("font-black text-white tracking-tight leading-none font-jetbrains", getValueFontSize(value))}>{value}</h4>
      </div>

      {trendData && (
        <div className={cn(
          "mb-6 transition-opacity duration-300 relative z-10",
          isHero ? "h-16 opacity-30" : "h-10 opacity-50 group-hover:opacity-100"
        )}>
          <Sparkline data={trendData} color={trendColor} onHover={setHoveredValue} />
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <div className={cn(
          "grid gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-800 relative z-10",
          isHero ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between group/item">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 group-hover/item:text-slate-300 transition-colors">
                <item.icon className={cn(isCompact ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "w-4 h-4")} />
                <span className={cn("font-black uppercase tracking-widest text-[7px] sm:text-[10px]")}>{item.label}</span>
              </div>
              <p className={cn("font-black text-white", isCompact ? "text-[10px] sm:text-sm" : "text-base")}>{item.value}</p>
            </div>
          ))}
          {isHero && (
             <div className="flex items-center justify-between group/item border-l border-slate-800 pl-6 hidden lg:flex">
               <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 group-hover/item:text-slate-300 transition-colors">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 <span className="font-black uppercase tracking-widest text-[10px]">Status Operasional</span>
               </div>
               <p className="font-black text-emerald-400 text-base">STABLE</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
