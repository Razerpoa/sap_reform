import { prisma } from "@/lib/prisma";
import { Download, TrendingUp, Package, Layers, DollarSign, Wallet, ShoppingBag, TrendingDown } from "lucide-react";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Penjualan (30h)" 
          value={`${(stats.salesTotalKg || 0).toLocaleString()} KG`}
          subtitle="Total telur terjual"
          icon={ShoppingBag}
          color="bg-blue-600"
          trend={`${(stats.salesTotalPeti || 0).toLocaleString()} peti terjual`}
        />
        <StatCard 
          title="Penjualan Hari Ini" 
          value={`${(stats.salesTodayKg || 0).toLocaleString()} KG`}
          subtitle="Terjual hari ini"
          icon={TrendingUp}
          color="bg-emerald-600"
          trend="Hari ini"
        />
        <StatCard 
          title="Total Pendapatan (30h)" 
          value={`Rp ${Math.round(stats.salesTotalRevenue || 0).toLocaleString()}`}
          subtitle="Total pendapatan penjualan"
          icon={DollarSign}
          color="bg-amber-500"
        />
        <StatCard 
          title="Produksi Terakhir" 
          value={`${(stats.productionLatestKg || 0).toLocaleString()} KG`}
          subtitle={productionEntries[0] ? format(productionEntries[0].date, "PPP") : "Tidak ada data"}
          icon={Layers}
          color="bg-indigo-600"
        />
        <StatCard 
          title="Saldo Kas" 
          value={`Rp ${(stats.cashFlowLatestCash || 0).toLocaleString()}`}
          subtitle="Aset liquid saat ini"
          icon={Wallet}
          color="bg-rose-600"
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

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  return (
    <div className="group bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`${color} p-4 rounded-3xl shadow-lg ring-4 ring-white`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        {trend && (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full ring-1 ring-slate-100">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
        <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
        <p className="text-xs font-bold text-slate-400 mt-2 italic">{subtitle}</p>
      </div>
    </div>
  );
}
