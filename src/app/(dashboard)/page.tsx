import { Download, TrendingUp, Package, Layers, DollarSign, Wallet, ShoppingBag, TrendingDown, Landmark, Receipt } from "lucide-react";
import Link from "next/link";
import Charts from "@/components/Charts";
import { PlusCircle, RefreshCw, BarChart2, Clock, CheckCircle2 } from "lucide-react";
import { calculateDashboardStats, calculateTotalKgFromCageData } from "@/lib/calculations";
import { getDashboardData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Use centralized data fetching
  const { productionEntries, cashFlowEntries, salesEntries, otherExpenses } = await getDashboardData({ take: 30 });
 
  // Use centralized calculation functions
  const stats = calculateDashboardStats(productionEntries, cashFlowEntries, salesEntries, otherExpenses);

  // Prepare data for charts
  const chartData = productionEntries.slice().reverse().map((p: any) => {
    const cf = cashFlowEntries.find((c: any) => c.date.toISOString().split('T')[0] === p.date.toISOString().split('T')[0]);
    // Calculate total salaries from the salaries object
    const salariesTotal = cf && cf.salaries 
      ? Object.values(cf.salaries).reduce((sum: number, salary: any) => sum + (salary || 0), 0)
      : 0;
    return {
      date: p.date,
      totalKg: calculateTotalKgFromCageData(p.cageData || {}),
      profit: cf ? (cf.totalPenjualan - cf.biayaPakan - cf.biayaOperasional - salariesTotal) : 0,
      expenses: cf ? (cf.biayaPakan + cf.biayaOperasional + salariesTotal) : 0,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Stats Section */}
      <div className="space-y-6">
        {/* Hero Card: Sales Performance */}
        <PremiumStatCard 
          variant="hero"
          title="Ringkasan Profit"
          value={`Rp ${formatNumber(Math.round(stats.cashFlowTotalProfit || 0))}`}
          subtitle="Profit (30h)"
          icon={stats.cashFlowTotalProfit >= 0 ? TrendingUp : TrendingDown}
          color={stats.cashFlowTotalProfit >= 0 ? "bg-emerald-600" : "bg-rose-600"}
          href="/profit"
          breakdown={[
            { label: "Avg Profit", value: `Rp ${formatNumber(Math.round(stats.cashFlowAvgProfit || 0))}`, icon: DollarSign }
          ]}
        />
        {/* Quad Grid Cards (4 in desktop, 2x2 in mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <PremiumStatCard 
            variant="compact"
            title="Produksi Hari ini"
            value={`${formatNumber(stats.productionLatestKg || 0)} KG`}
            subtitle="Produksi"
            icon={Layers}
            color="bg-indigo-600"
            breakdown={[
              { label: "Avg (30h)", value: `${formatNumber(stats.productionAvgKg || 0)} KG`, icon: Package }
            ]}
            href="/produksi"
          />
          <PremiumStatCard 
            variant="compact"
            title="Terjual Hari Ini"
            value={`${formatNumber(stats.salesTodayKg || 0)} KG`}
            subtitle="Terjual"
            icon={stats.salesTodayKg >= 0 ? TrendingUp : TrendingDown}
            color="bg-emerald-600"
            breakdown={[
              { label: "Peti", value: `${formatNumber(stats.salesTodayPeti || 0)} Peti`, icon: Layers }
            ]}
          />
          <PremiumStatCard 
            variant="compact"
            title="Total Pengeluaran"
            value={`Rp ${formatNumber(stats.cashFlowTodayExpenses || 0)}`}
            subtitle={`biaya beban`}
            icon={Receipt}
            color="bg-rose-500"
            href="/profit"
            breakdown={[
              { label: "Sebulan ini", value: `Rp ${formatNumber(stats.cashFlowMonthExpenses || 0)}`, icon: ShoppingBag },
            ]}
          />
          <PremiumStatCard 
            variant="compact"
            title="Saldo"
            value={`Rp ${formatNumber(stats.cashFlowTotalLiquidAssets || 0)}`}
            subtitle="Live Balance"
            icon={Wallet}
            color="bg-blue-600"
            breakdown={[
              { label: "Rekening", value: `Rp ${formatNumber(stats.cashFlowSaldoRekening || 0)}`, icon: Landmark },
              { label: "Cash", value: `Rp ${formatNumber(stats.cashFlowSaldoCash || 0)}`, icon: DollarSign }
            ]}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tren Produksi</h3>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-blue-600"></div>
               <span className="text-xs font-bold text-slate-400">Total KG</span>
            </div>
          </div>
          <div className="h-80 w-full min-h-80">
            <Charts data={chartData} type="production" />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kinerja Keuangan</h3>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profit</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Biaya</span>
               </div>
            </div>
          </div>
          <div className="h-80 w-full min-h-80">
            <Charts data={chartData} type="finance" />
          </div>
        </div>
      </div>
    </div>
  );
}

function format(date: Date, str: string) {
  return new Date(date).toLocaleDateString();
}

// Added 'href' to the props destructuring
// Default href to '#' so it doesn't break, or leave as undefined
function PremiumStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  breakdown, 
  variant, 
  href = "#" // Defaulting to '#' 
}: any) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  
  // Logic to determine if the card should actually act as a link
  const isClickable = href && href !== "#";
  const Wrapper = isClickable ? 'a' : 'div';

  const colorMatch = color.match(/bg-([a-z]+)-/);
  const colorName = colorMatch ? colorMatch[1] : "slate";
  const badgeText = colorName === "slate" ? "text-slate-400" : `text-${colorName}-400`;
  const badgeBg = colorName === "slate" ? "bg-slate-800/50" : `bg-${colorName}-500/10`;
  const badgeRing = colorName === "slate" ? "ring-white/5" : `ring-${colorName}-500/20`;

  return (
    <Wrapper 
      href={isClickable ? href : undefined}
      className={cn(
        "group block bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl transition-all duration-300 text-white overflow-hidden relative animate-in fade-in zoom-in-95 hover:shadow-slate-500/10 hover:-translate-y-1 hover:border-slate-700",
        // Conditional Interactive Styles
        isClickable 
          ? "cursor-pointer" 
          : "cursor-default",
        isHero ? "p-6 sm:p-8 mb-4" : isCompact ? "p-3 sm:p-5" : "p-6"
      )}
    >
      {/* Dynamic Glow Ornament */}
      <div className={`absolute -top-10 -right-10 w-48 h-48 ${color.replace('bg-', 'bg-')}/10 rounded-full blur-[60px] group-hover:blur-[80px] group-hover:scale-125 transition-all duration-500 opacity-20`}></div>
      
      <div className={cn("flex items-start justify-between relative z-10", isCompact ? "mb-3" : "mb-6")}>
        <div className={cn(
          color, 
          "rounded-xl shadow-lg ring-4 ring-slate-800 transition-transform duration-300",
          isClickable ? "group-hover:scale-110" : "", // Only scale icon if clickable
          isCompact ? "p-2 sm:p-3" : "p-4"
        )}>
          <Icon className={cn("text-white", isCompact ? "w-4 h-4 sm:w-6 sm:h-6" : "w-7 h-7")} />
        </div>
        <span className={cn(
          "font-black uppercase tracking-widest rounded-full ring-1 transition-all duration-300",
          badgeText, badgeBg, badgeRing,
          isCompact ? "text-[8px] px-2 py-1" : "text-[10px] px-4 py-2"
        )}>
          {subtitle}
        </span>
      </div>
      
      <div className={cn("relative z-10", isCompact ? "mb-2" : "mb-4")}>
        <p className={cn("font-black uppercase tracking-[0.2em] text-slate-500 mb-1", isCompact ? "text-[8px] sm:text-[10px]" : "text-[11px]")}>{title}</p>
        <h4 className={cn(
          "font-black text-white tracking-tight leading-tight break-all sm:wrap-break-word", 
          isHero ? "text-3xl sm:text-5xl lg:text-7xl" : isCompact ? "text-xl sm:text-2xl" : "text-3xl"
        )}>
          {value}
        </h4>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className={cn(
          "grid gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-800 relative z-10",
          isHero ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {breakdown.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between group/item">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 group-hover/item:text-slate-300 transition-colors">
                <item.icon className={cn(isCompact ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "w-4 h-4")} />
                <span className={cn("font-black uppercase tracking-widest text-[7px] sm:text-[10px]")}>{item.label}</span>
              </div>
              <p className={cn("font-black text-white", isCompact ? "text-[10px] sm:text-sm" : "text-base")}>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  );
}