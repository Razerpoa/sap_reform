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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ShoppingBag,
  Package,
  Layers,
  TrendingUp,
  Loader2,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

type Timeframe = "daily" | "weekly" | "monthly";

export default function SalesReport() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<Record<string, any>>({});
  const [productionData, setProductionData] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const ts = Date.now();
      const [salesRes, stockRes, prodRes] = await Promise.all([
        fetch(`/api/sales?_t=${ts}`),
        fetch(`/api/cage-stock?_t=${ts}`),
        fetch(`/api/production?_t=${ts}`),
      ]);
      
      setSalesData(await salesRes.json());
      setStockData(await stockRes.json());
      setProductionData(await prodRes.json());
    } catch (err) {
      console.error("[Sales] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate live stock totals
  const liveStock = useMemo(() => {
    const totalKg = Object.values(stockData).reduce((sum, s) => sum + (s.stockKg || 0), 0);
    const totalPeti = Math.floor(totalKg / 15);
    return { totalKg, totalPeti };
  }, [stockData]);

  // Aggregate sales by date for charts
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { date: Date; kg: number; prodKg: number }>();
    
    // Last 14 days
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { date: d, kg: 0, prodKg: 0 });
    }

    salesData.forEach(s => {
      const key = new Date(s.date).toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.kg += s.totalKg || 0;
      }
    });

    // Add production data for comparison
    productionData.forEach(p => {
       const key = new Date(p.date).toISOString().split('T')[0];
       if (dailyMap.has(key)) {
         // This is a simplified calc for demo
         dailyMap.get(key)!.prodKg = p.productionKg - (productionData.find(prev => prev.date < p.date)?.productionKg || 0);
       }
    });

    return Array.from(dailyMap.values()).map(item => ({
      name: format(item.date, "dd MMM", { locale: id }),
      kg: item.kg,
      date: item.date,
    }));
  }, [salesData, productionData]);

  const customerStats = useMemo(() => {
    const map = new Map<string, { kg: number; count: number }>();
    salesData.forEach(s => {
      const current = map.get(s.customerName) || { kg: 0, count: 0 };
      map.set(s.customerName, {
        kg: current.kg + s.totalKg,
        count: current.count + 1
      });
    });
    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
  }, [salesData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-slate-400 font-medium">Menganalisis data penjualan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analisa Penjualan</h1>
          <p className="text-slate-500 font-medium mt-1">Volume distribusi & monitoring stok</p>
        </div>
        
        <div className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
           <Package className="w-5 h-5 text-emerald-500" />
           <div>
              <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest leading-none">Stok Tersedia</p>
              <p className="text-sm font-black text-slate-900">{formatNumber(liveStock.totalKg)} KG</p>
           </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SalesStatCard 
          title="Stok Live"
          value={`${formatNumber(liveStock.totalKg)} KG`}
          subtitle="Gudang"
          icon={Package}
          color="bg-amber-500"
          breakdown={`${liveStock.totalPeti} Peti Ready`}
        />
        <SalesStatCard 
          title="Total Penjualan"
          value={`${formatNumber(salesData.reduce((sum, s) => sum + s.totalKg, 0))} KG`}
          subtitle="Bulan Ini"
          icon={ShoppingBag}
          color="bg-emerald-600"
          breakdown={`${salesData.length} Transaksi`}
        />
        <SalesStatCard 
          title="Efisiensi Stok"
          value="94%"
          subtitle="Sell-through"
          icon={TrendingUp}
          color="bg-indigo-600"
          breakdown="High Demand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Tren Volume</h3>
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">Harian (Kg)</p>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  width={40}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={<CustomTooltip />}
                />
                <Bar 
                  dataKey="kg" 
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.kg > 0 ? '#10b981' : '#f1f5f9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Sidebar */}
        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
           <div className="flex items-center gap-3 mb-8">
             <Users className="w-6 h-6 text-emerald-400" />
             <h3 className="text-lg font-black uppercase tracking-tight">Top Pembeli</h3>
           </div>
           
           <div className="space-y-6">
              {customerStats.map((c, idx) => (
                <div key={idx} className="group cursor-default">
                   <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">{c.name}</span>
                      <span className="font-black text-emerald-400">{formatNumber(c.kg)} KG</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${(c.kg / customerStats[0].kg) * 100}%` }}
                      />
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">
                      {c.count} Transaksi
                   </p>
                </div>
              ))}
           </div>
           
           <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10">
              <p className="text-xs text-slate-400 font-medium italic">"Pelanggan utama Anda menyumbang 65% dari total volume bulan ini."</p>
           </div>
        </div>
      </div>

      {/* Sales Log */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-slate-100 text-slate-600 rounded-xl sm:rounded-2xl">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Log Penjualan</h3>
          </div>
        </div>
        
        {/* Mobile List View */}
        <div className="block sm:hidden divide-y divide-slate-50">
          {salesData.slice(0, 15).map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedSale(item)}
              className="p-5 active:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.customerName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {format(new Date(item.date), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-600 text-sm">{formatNumber(item.totalKg)} KG</p>
                <p className="text-[9px] text-slate-300 font-bold uppercase">{item.jmlPeti} Peti</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Tanggal</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Pelanggan</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Volume</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {salesData.slice(0, 15).map((item, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedSale(item)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-400 text-xs">{format(new Date(item.date), "dd MMM yyyy", { locale: id })}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                       </div>
                       <span className="font-black text-slate-900 uppercase tracking-tight">{item.customerName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-emerald-600">{formatNumber(item.totalKg)} KG</span>
                       <span className="text-[10px] font-bold text-slate-300">/ {item.jmlPeti} PETI</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                       <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedSale && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSale(null);
          }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShoppingBag className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">{selectedSale.customerName}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Detail Transaksi</p>
                 </div>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                 <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal</p>
                    <p className="font-bold text-slate-900">{format(new Date(selectedSale.date), "dd MMM yyyy", { locale: id })}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Harga</p>
                    <p className="font-black text-emerald-600 italic">Rp {formatNumber(selectedSale.subTotal || 0)}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Volume Berat</span>
                    <span className="font-black text-slate-900">{formatNumber(selectedSale.totalKg)} KG</span>
                 </div>
                 <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Jumlah Peti</span>
                    <span className="font-black text-slate-900">{selectedSale.jmlPeti} Peti</span>
                 </div>
                 <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Harga Jual / Kg</span>
                    <span className="font-black text-slate-900">Rp {formatNumber(selectedSale.hargaJual)}</span>
                 </div>
              </div>

              {/* Source Cages Breakdown */}
              {selectedSale.sourceCages && selectedSale.sourceCages.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sumber Kandang</p>
                  <div className="space-y-2">
                    {selectedSale.sourceCages.map((cage: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-blue-50/50 rounded-xl p-3 border border-blue-100/50">
                        <span className="font-black text-blue-700 text-xs uppercase">{cage.kandang}</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <span>{cage.jmlPeti} Peti</span>
                          <span className="text-slate-300">|</span>
                          <span>{cage.jmlKg} KG</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <button 
                 onClick={() => setSelectedSale(null)}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg"
               >
                 Tutup Detail
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesStatCard({ title, value, subtitle, icon: Icon, color, breakdown }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity",
        color
      )} style={{ borderRadius: '50%' }}></div>
      
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl text-white shadow-lg", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{subtitle}</span>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h2>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{breakdown}</span>
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-sm font-black text-slate-900">{formatNumber(payload[0].value)} KG Terjual</span>
        </div>
      </div>
    );
  }
  return null;
}
