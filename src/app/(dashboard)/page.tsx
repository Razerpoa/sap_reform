import { prisma } from "@/lib/prisma";
import { Download, TrendingUp, Package, Layers, DollarSign, Wallet, ShoppingBag, TrendingDown, Landmark } from "lucide-react";
import Link from "next/link";
import Charts from "@/components/Charts";
import { calculateDashboardStats } from "@/lib/calculations";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [productionEntries, cashFlowEntries, salesEntries] = await Promise.all([
    prisma.production.findMany({
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.cashFlow.findMany({
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.sales.findMany({
      orderBy: { date: "desc" },
      take: 30,
    })
  ]);

  // Use centralized calculation functions
  const stats = calculateDashboardStats(productionEntries, cashFlowEntries, salesEntries);

  // Prepare data for charts
  const chartData = productionEntries.slice().reverse().map((p: any) => {
    const cf = cashFlowEntries.find((c: any) => c.date.toISOString().split('T')[0] === p.date.toISOString().split('T')[0]);
    return {
      date: p.date,
      totalKg: p.totalKg,
      profit: cf ? (cf.totalPenjualan - cf.biayaPakan - cf.biayaOperasional) : 0,
      expenses: cf ? (cf.biayaPakan + cf.biayaOperasional) : 0,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Eksekutif</h1>
          <p className="text-slate-500 font-medium italic">Pemantauan kinerja & keuangan komprehensif</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/api/export" // Update export API later if needed
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-5 h-5 border-2 border-slate-700 rounded-lg p-0.5" />
            Export Data
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-6">
        {/* Hero Card: Sales Performance */}
        <PremiumStatCard 
          variant="hero"
          title="Kinerja Penjualan"
          value={`Rp ${Math.round(stats.salesTotalRevenue || 0).toLocaleString()}`}
          subtitle="Total Pendapatan (30h)"
          icon={DollarSign}
          color="bg-amber-500"
          breakdown={[
            { label: "Total Volume", value: `${(stats.salesTotalKg || 0).toLocaleString()} KG`, icon: ShoppingBag },
            { label: "Total Peti", value: `${(stats.salesTotalPeti || 0).toLocaleString()} Peti`, icon: Layers }
          ]}
        />

        {/* Quad Grid Cards (4 in desktop, 2x2 in mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <PremiumStatCard 
            variant="compact"
            title="Produksi Hari ini"
            value={`${(stats.productionLatestKg || 0).toLocaleString()} KG`}
            subtitle="Produksi"
            icon={Layers}
            color="bg-indigo-600"
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
            breakdown={[
              { label: "Peti Hari Ini", value: `${(stats.salesTodayPeti || 0).toLocaleString()} Peti`, icon: Layers }
            ]}
          />
          <PremiumStatCard 
            variant="compact"
            title="Ringkasan Profit"
            value={`Rp ${Math.round(stats.cashFlowTotalProfit || 0).toLocaleString()}`}
            subtitle="Total Profit (30h)"
            icon={TrendingDown}
            color="bg-rose-600"
            breakdown={[
              { label: "Avg Profit", value: `Rp ${Math.round(stats.cashFlowAvgProfit || 0).toLocaleString()}`, icon: DollarSign }
            ]}
          />
          <BalanceCard 
            variant="compact"
            title="Saldo"
            total={stats.cashFlowTotalLiquidAssets || 0}
            rekening={stats.cashFlowSaldoRekening || 0}
            cash={stats.cashFlowSaldoCash || 0}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[64px] border border-slate-200 shadow-sm">
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

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
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

function format(date: Date, str: string) {
  return new Date(date).toLocaleDateString();
}

function PremiumStatCard({ title, value, subtitle, icon: Icon, color, breakdown, variant }: any) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <div className={cn(
      "group bg-slate-900 rounded-[64px] border border-slate-800 shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-1 transition-all duration-300 text-white overflow-hidden relative",
      isHero ? "p-8 sm:p-12" : isCompact ? "p-3 sm:p-8" : "p-8"
    )}>
      <div className={`absolute -top-10 -right-10 w-40 h-40 ${color.replace('bg-', 'bg-')}/10 rounded-full blur-3xl group-hover:opacity-40 transition-all opacity-20`}></div>
      
      <div className={cn("flex items-start justify-between", isCompact ? "mb-4" : "mb-6")}>
        <div className={cn(
          color, 
          "rounded-[32px] shadow-lg ring-4 ring-slate-800",
          isCompact ? "p-2.5 sm:p-4" : "p-4"
        )}>
          <Icon className={cn("text-white", isCompact ? "w-4 h-4 sm:w-7 sm:h-7" : "w-7 h-7")} />
        </div>
        <span className={cn(
          "font-black uppercase tracking-widest text-slate-500 bg-slate-800/50 rounded-full ring-1 ring-white/5",
          isCompact ? "text-[8px] px-2 py-1" : "text-[10px] px-3 py-1.5"
        )}>
          {subtitle}
        </span>
      </div>
      
      <div className={cn(isCompact ? "mb-4" : "mb-6")}>
        <p className={cn("font-black uppercase tracking-[0.2em] text-slate-500 mb-1", isCompact ? "text-[8px] sm:text-[11px]" : "text-[11px]")}>{title}</p>
        <h4 className={cn("font-black text-white tracking-tight", isHero ? "text-5xl" : isCompact ? "text-lg sm:text-3xl" : "text-3xl")}>{value}</h4>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className={cn(
          "grid gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-800",
          isHero ? "grid-cols-2" : "grid-cols-1"
        )}>
          {breakdown.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
                <item.icon className={cn(isCompact ? "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" : "w-3.5 h-3.5")} />
                <span className={cn("font-black uppercase tracking-widest text-[7px] sm:text-[10px]")}>{item.label}</span>
              </div>
              <p className={cn("font-black text-white", isCompact ? "text-[9px] sm:text-sm" : "text-sm")}>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BalanceCard({ title, total, rekening, cash, variant }: any) {
  const isCompact = variant === "compact";
  
  return (
    <div className={cn(
      "group bg-slate-900 rounded-[64px] border border-slate-800 shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-1 transition-all duration-300 text-white overflow-hidden relative",
      isCompact ? "p-4 sm:p-8" : "p-8"
    )}>
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all"></div>
      
      <div className={cn("flex items-start justify-between", isCompact ? "mb-4" : "mb-6")}>
        <div className={cn(
          "bg-blue-600 rounded-[32px] shadow-lg ring-4 ring-slate-800",
          isCompact ? "p-2.5 sm:p-4" : "p-4"
        )}>
          <Wallet className={cn("text-white", isCompact ? "w-4 h-4 sm:w-7 sm:h-7" : "w-7 h-7")} />
        </div>
        <span className={cn(
          "font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 rounded-full ring-1 ring-blue-500/20",
          isCompact ? "text-[8px] px-2 py-1" : "text-[10px] px-3 py-1.5"
        )}>
          Live Balance
        </span>
      </div>
      
      <div className={cn(isCompact ? "mb-4" : "mb-6")}>
        <p className={cn("font-black uppercase tracking-[0.2em] text-slate-500 mb-1", isCompact ? "text-[8px] sm:text-[11px]" : "text-[11px]")}>{title}</p>
        <h4 className={cn("font-black text-white tracking-tight", isCompact ? "text-lg sm:text-3xl" : "text-3xl")}>Rp {Math.round(total).toLocaleString()}</h4>
      </div>

      <div className={cn(
          "grid gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-800",
          isCompact ? "grid-cols-1" : "grid-cols-2"
        )}>
        <div className="space-y-1">
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500">
            <Landmark className={cn(isCompact ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3")} />
            <span className={cn("font-black uppercase tracking-widest text-[7px] sm:text-[9px]")}>Rekening</span>
          </div>
          <p className={cn("font-black text-white", isCompact ? "text-[9px] sm:text-sm" : "text-sm")}>Rp {Math.round(rekening).toLocaleString()}</p>
        </div>
        <div className={cn("space-y-1", !isCompact && "border-l border-slate-800 pl-4")}>
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500">
            <DollarSign className={cn(isCompact ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3")} />
            <span className={cn("font-black uppercase tracking-widest text-[7px] sm:text-[9px]")}>Cash</span>
          </div>
          <p className={cn("font-black text-white", isCompact ? "text-[9px] sm:text-sm" : "text-sm")}>Rp {Math.round(cash).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
