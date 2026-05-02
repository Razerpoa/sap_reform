"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Wallet,
  Landmark,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

type Timeframe = "30d" | "all";

export default function CashFlowReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const ts = Date.now();
      const res = await fetch(`/api/cashflow?_t=${ts}`);
      const json = await res.json();
      // Reverse to get chronological order for charts
      setData(Array.isArray(json) ? json.slice().reverse() : []);
    } catch (err) {
      console.error("[CashFlow] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const filtered = timeframe === "30d" ? data.slice(-30) : data;
    return filtered.map((item) => ({
      name: format(new Date(item.date), "dd MMM", { locale: id }),
      total: (item.saldoKas || 0) + (item.saldoCash || 0),
      rekening: item.saldoKas || 0,
      cash: item.saldoCash || 0,
      date: item.date,
    }));
  }, [data, timeframe]);

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;

  const stats = useMemo(() => {
    if (!latest) return { total: 0, rekening: 0, cash: 0, change: 0 };
    const total = (latest.saldoKas || 0) + (latest.saldoCash || 0);
    const prevTotal = previous ? (previous.saldoKas || 0) + (previous.saldoCash || 0) : total;
    const change = total - prevTotal;
    
    return {
      total,
      rekening: latest.saldoKas || 0,
      cash: latest.saldoCash || 0,
      change,
    };
  }, [latest, previous]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-400 font-medium">Memuat data saldo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Arus Kas & Saldo</h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Laporan posisi keuangan real-time</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start">
          <button
            onClick={() => setTimeframe("30d")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              timeframe === "30d" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            30 Hari
          </button>
          <button
            onClick={() => setTimeframe("all")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              timeframe === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BalanceCard 
          title="Total Saldo"
          value={stats.total}
          subtitle="Aset Lancar"
          icon={Wallet}
          color="bg-blue-600"
          trend={stats.change}
        />
        <BalanceCard 
          title="Saldo Rekening"
          value={stats.rekening}
          subtitle="Bank & Digital"
          icon={Landmark}
          color="bg-indigo-600"
        />
        <BalanceCard 
          title="Saldo Tunai"
          value={stats.cash}
          subtitle="Uang di Tangan"
          icon={DollarSign}
          color="bg-emerald-600"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Tren Saldo</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">Akumulasi Harian</p>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] sm:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                dy={15}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `Rp ${formatNumber(val)}`}
                width={100}
              />
              <Tooltip 
                content={<CustomTooltip />}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#2563eb" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                activeDot={{ r: 8, strokeWidth: 0, fill: "#2563eb" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Riwayat Saldo</h3>
          </div>
        </div>
        
        {/* Mobile List View */}
        <div className="block sm:hidden divide-y divide-slate-50">
          {data.slice().reverse().map((item, idx) => {
            const total = (item.saldoKas || 0) + (item.saldoCash || 0);
            return (
              <div key={idx} className="p-5 active:bg-slate-50 transition-colors">
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-slate-300" />
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {format(new Date(item.date), "dd MMM yyyy", { locale: id })}
                       </span>
                    </div>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg uppercase tracking-tighter">
                       Total Akhir
                    </span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                          <Landmark className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Bank:</span>
                          <span className="text-xs font-black text-slate-900 italic">Rp {formatNumber(item.saldoKas || 0)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Cash:</span>
                          <span className="text-xs font-black text-slate-900 italic">Rp {formatNumber(item.saldoCash || 0)}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-slate-900 tracking-tight">Rp {formatNumber(total)}</p>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Tanggal</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Rekening</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Cash</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 text-right">Total Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice().reverse().map((item, idx) => {
                const total = (item.saldoKas || 0) + (item.saldoCash || 0);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="font-bold text-slate-700">{format(new Date(item.date), "dd MMMM yyyy", { locale: id })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-black text-slate-900 italic">Rp {formatNumber(item.saldoKas || 0)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-black text-slate-900 italic">Rp {formatNumber(item.saldoCash || 0)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-black">
                        Rp {formatNumber(total)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity",
        color
      )} style={{ borderRadius: '50%' }}></div>
      
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={cn("p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white shadow-lg", color)}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{subtitle}</span>
      </div>
      
      <div className="space-y-1">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rp {formatNumber(value)}</h2>
      </div>

      {trend !== undefined && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-50 flex items-center gap-2">
          {trend >= 0 ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-black">+Rp {formatNumber(trend)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-600">
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-black">-Rp {formatNumber(Math.abs(trend))}</span>
            </div>
          )}
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sejak kemarin</span>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-100 shadow-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Total Saldo</span>
            </div>
            <span className="text-sm font-black text-slate-900">Rp {formatNumber(payload[0].value)}</span>
          </div>
          {payload[0].payload.rekening !== undefined && (
             <div className="flex items-center justify-between gap-8 border-t border-slate-50 pt-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Rekening</span>
               <span className="text-xs font-bold text-slate-600">Rp {formatNumber(payload[0].payload.rekening)}</span>
             </div>
          )}
          {payload[0].payload.cash !== undefined && (
             <div className="flex items-center justify-between gap-8">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Cash</span>
               <span className="text-xs font-bold text-slate-600">Rp {formatNumber(payload[0].payload.cash)}</span>
             </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
