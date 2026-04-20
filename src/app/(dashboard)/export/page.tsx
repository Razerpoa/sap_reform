"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Archive, Calendar, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWIBDateString } from "@/lib/date-utils";

export default function ExportPage() {
  const [formatType, setFormatType] = useState<"xlsx" | "csv">("xlsx");
  const [startDate, setStartDate] = useState(getWIBDateString());
  const [endDate, setEndDate] = useState(getWIBDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleExport() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const params = new URLSearchParams();
      params.set("format", formatType);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }

      // Get filename from content-disposition header
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `sap-reform-export.${formatType === "xlsx" ? "xlsx" : "zip"}`;

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Export Data</h1>
        <p className="text-sm text-slate-500 mt-1">Download your data in XLSX or CSV format</p>
      </div>

      {/* Format Selection */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Format</h3>
        <div className="grid grid-cols-2 gap-3 p-3">
          <button
            onClick={() => setFormatType("xlsx")}
            className={cn(
              "flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-black text-sm transition-all",
              formatType === "xlsx"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-2"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <FileSpreadsheet className="w-5 h-5" />
            XLSX
          </button>
          <button
            onClick={() => setFormatType("csv")}
            className={cn(
              "flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-black text-sm transition-all",
              formatType === "csv"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-2"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Archive className="w-5 h-5" />
            CSV (ZIP)
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center">
          {formatType === "xlsx" 
            ? "Single .xlsx file with 4 sheets: Production, Sales, CashFlow, User"
            : "Single .zip file with 4 CSV files: Production, Sales, CashFlow, User"}
        </p>
      </div>

      {/* Date Range */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Date Range (Optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Start Date</label>
            <div className="relative flex">
              <input
                type="date"
                value={startDate}
                // This triggers the native calendar UI on click
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch (error) {
                    console.log("Browser does not support showPicker");
                  }
                }}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 transition-all cursor-pointer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                // This triggers the native calendar UI on click
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch (error) {
                    console.log("Browser does not support showPicker");
                  }
                }}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-200 transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>
        <p className=" text-xs text-slate-400 mt-3">
          Leave empty to export all data
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          Export completed successfully
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-700 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-blue-500/10 disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export {formatType.toUpperCase()}
          </>
        )}
      </button>

      {/* Preview Info */}
      <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <h4 className="font-black text-slate-900 mb-4">Included Sheets</h4>
        <div className="space-y-2">
          {[
            { name: "Production", desc: "Produksi harian per kandang" },
            { name: "Sales", desc: "Transaksi penjualan" },
            { name: "CashFlow", desc: "Gaji dan CashFlow" },
            { name: "User", desc: "Data user" },
          ].map((sheet) => (
            <div key={sheet.name} className="flex items-center justify-between text-sm w-64">
              {/* shrink-0 ensures the name doesn't get squashed */}
              <span className="font-bold text-slate-700 shrink-0 mr-4">{sheet.name}</span>
              
              {/* truncate requires a defined width or min-width-0 in a flex container */}
              <span className="text-slate-400 truncate min-w-0">{sheet.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}