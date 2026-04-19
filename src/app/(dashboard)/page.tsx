import { prisma } from "@/lib/prisma";
import { Download, TrendingUp, Package, Layers, DollarSign, Wallet, ShoppingBag, TrendingDown, Landmark } from "lucide-react";
import Link from "next/link";
import Charts from "@/components/Charts";
import { calculateDashboardStats } from "@/lib/calculations";

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumStatCard 
          title="Produksi Telur"
          value={`${(stats.productionLatestKg || 0).toLocaleString()} KG`}
          subtitle="Produksi Terakhir"
          icon={Layers}
          color="bg-indigo-600"
          breakdown={[
            { label: "Rata-rata (30h)", value: `${Math.round(stats.productionAvgKg || 0).toLocaleString()} KG`, icon: Package }
          ]}
        />
        <PremiumStatCard 
          title="Kinerja Penjualan"
          value={`Rp ${Math.round(stats.salesTotalRevenue || 0).toLocaleString()}`}
          subtitle="Total Pendapatan (30h)"
          icon={DollarSign}
          color="bg-amber-500"
          breakdown={[
            { label: "Total Volume", value: `${(stats.salesTotalKg || 0).toLocaleString()} KG`, icon: ShoppingBag }
          ]}
        />
        <PremiumStatCard 
          title="Aktivitas Hari Ini"
          value={`${(stats.salesTodayKg || 0).toLocaleString()} KG`}
          subtitle="Total Terjual"
          icon={TrendingUp}
          color="bg-emerald-600"
          breakdown={[
            { label: "Jumlah Peti", value: `${(stats.salesTodayPeti || 0).toLocaleString()} Peti`, icon: Layers }
          ]}
        />
        <BalanceCard 
          title="Saldo Keuangan"
          total={stats.cashFlowTotalLiquidAssets || 0}
          rekening={stats.cashFlowSaldoRekening || 0}
          cash={stats.cashFlowSaldoCash || 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
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

function PremiumStatCard({ title, value, subtitle, icon: Icon, color, breakdown }: any) {
  return (
    <div className="group bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-1 transition-all duration-300 text-white overflow-hidden relative">
      {/* Decorative background element */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 ${color.replace('bg-', 'bg-')}/10 rounded-full blur-3xl group-hover:opacity-40 transition-all opacity-20`}></div>
      
      <div className="flex items-start justify-between mb-6">
        <div className={`${color} p-4 rounded-3xl shadow-lg ring-4 ring-slate-800`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-white/5">
          {subtitle}
        </span>
      </div>
      
      <div className="mb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</p>
        <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-800">
          {breakdown.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <item.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </div>
              <p className="text-sm font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BalanceCard({ title, total, rekening, cash }: any) {
  return (
    <div className="group bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl hover:shadow-slate-500/10 hover:-translate-y-1 transition-all duration-300 text-white overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all"></div>
      
      <div className="flex items-start justify-between mb-6">
        <div className="bg-blue-600 p-4 rounded-3xl shadow-lg ring-4 ring-slate-800">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full ring-1 ring-blue-500/20">
          Live Balance
        </span>
      </div>
      
      <div className="mb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</p>
        <h4 className="text-3xl font-black text-white tracking-tight">Rp {Math.round(total).toLocaleString()}</h4>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Landmark className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Rekening</span>
          </div>
          <p className="text-sm font-black text-white">Rp {Math.round(rekening).toLocaleString()}</p>
        </div>
        <div className="space-y-1 border-l border-slate-800 pl-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <DollarSign className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Cash</span>
          </div>
          <p className="text-sm font-black text-white">Rp {Math.round(cash).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
