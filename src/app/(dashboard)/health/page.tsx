"use client";

import { useState } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  Database,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrityResult, IntegrityIssue } from "@/lib/integrity";

export default function HealthPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrity");
      if (!res.ok) throw new Error("Gagal mengambil data kesehatan sistem");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kesehatan Sistem</h1>
          <p className="text-slate-500 font-medium">Verifikasi integritas data dan sinkronisasi database</p>
        </div>
        
        <button
          onClick={startCheck}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Jalankan Verifikasi
        </button>
      </div>

      {!result && !loading && !error && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xl shadow-slate-200/50">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Siap untuk verifikasi?</h2>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            Sistem akan memindai seluruh transaksi produksi dan penjualan untuk memastikan tidak ada kesalahan kalkulasi.
          </p>
          <button
            onClick={startCheck}
            className="text-blue-600 font-bold flex items-center gap-2 mx-auto hover:gap-3 transition-all"
          >
            Mulai Sekarang <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <Database className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Memindai Database...</h3>
          <p className="text-slate-500 font-medium">Melakukan rekonsiliasi data dari ribuan entri</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-700">
          <AlertTriangle className="w-8 h-8" />
          <div>
            <h4 className="font-bold">Terjadi Kesalahan</h4>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Produksi</p>
              <h4 className="text-2xl font-black text-slate-900">{result.stats.totalProductionKg.toLocaleString('id-ID')} <span className="text-sm text-slate-400">Kg</span></h4>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Terjual</p>
              <h4 className="text-2xl font-black text-slate-900">{result.stats.totalSoldKg.toLocaleString('id-ID')} <span className="text-sm text-slate-400">Kg</span></h4>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                result.stats.currentStockKg < 0 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
              )}>
                <Database className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Stok Saat Ini</p>
              <h4 className="text-2xl font-black text-slate-900">{result.stats.currentStockKg.toLocaleString('id-ID')} <span className="text-sm text-slate-400">Kg</span></h4>
            </div>
          </div>

          {/* Result Status */}
          <div className={cn(
            "p-8 rounded-[2rem] border flex flex-col md:flex-row items-center gap-8 shadow-xl",
            result.status === "OK" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-200/20" 
              : "bg-red-50 border-red-100 text-red-900 shadow-red-200/20"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center shrink-0",
              result.status === "OK" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            )}>
              {result.status === "OK" ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black mb-2">
                {result.status === "OK" ? "Data Sempurna" : "Ditemukan Ketidaksesuaian"}
              </h3>
              <p className="text-sm font-medium opacity-70">
                {result.status === "OK" 
                  ? "Seluruh kalkulasi kumulatif dan sinkronisasi antar tabel telah diverifikasi dan dalam keadaan benar."
                  : `Ditemukan ${result.issues.length} masalah yang memerlukan perhatian segera untuk menjaga akurasi laporan.`
                }
              </p>
            </div>
          </div>

          {/* Issues List */}
          {result.issues.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 ml-2">Detail Masalah</h3>
              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Tipe</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Masalah</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Ekspektasi</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Aktual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.issues.map((issue, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">{issue.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            issue.type === "PRODUCTION" ? "bg-emerald-100 text-emerald-700" :
                            issue.type === "SALES" ? "bg-blue-100 text-blue-700" :
                            issue.type === "CASHFLOW" ? "bg-purple-100 text-purple-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {issue.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{issue.message}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">{issue.expected}</td>
                        <td className="px-6 py-4 text-sm font-bold text-red-600">{issue.actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
