"use client";

import { useState, useMemo, useEffect, useRef, forwardRef } from "react";
import { format, subDays, isSameDay } from "date-fns";
import { getWIBDateString } from "@/lib/date-utils";
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar,
  ShoppingBag,
  Wallet,
  Settings2,
  TrendingUp,
  ChevronDown,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "production" | "master" | "cashflow" | "sales";

const CATS = ["b1", "b1p", "b2", "b2p", "b3", "b3p"];
const CATEGORY_MAP: Record<string, string> = {
  b1: "B1", b1p: "B1+", b2: "B2", b2p: "B2+", b3: "B3", b3p: "B3+"
};

interface ProductionData {
  [key: string]: number;
  hargaSentral?: number;
  up?: number;
  operasional?: number;
  profitDaily?: number;
}

interface CashFlowData {
  date: Date | string;
  totalPenjualan?: number;
  biayaPakan?: number;
  biayaOperasional?: number;
  gajiBepuk?: number;
  gajiBarman?: number;
  gajiAgung?: number;
  gajiEki?: number;
  gajiAdi?: number;
  devidenA?: number;
  devidenB?: number;
  saldoKas?: number;
  saldoCash?: number;
}

interface SaleData {
  id?: string;
  customerName: string;
  jmlPeti: number;
  totalKg: number;
  hargaJual: number;
  subTotal: number;
}

export default function EntryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("production");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFinancialDetails, setShowFinancialDetails] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form States
  const [productionData, setProductionData] = useState<ProductionData>({});
  const [masterData, setMasterData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData>({ date: new Date() });
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [newSale, setNewSale] = useState<Partial<SaleData>>({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });

  const isEditable = useMemo(() => {
    if (activeTab === "master") return true;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return getWIBDateString(new Date(dateStr)) === getWIBDateString();
  }, [selectedDate, activeTab]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      if (activeTab === "production") {
        const res = await fetch(`/api/production?date=${dateStr}`);
        const data = await res.json();
        setProductionData(data || {});
      } else if (activeTab === "master") {
        const res = await fetch(`/api/master`);
        const data = await res.json();
        setMasterData(data || []);
      } else if (activeTab === "cashflow") {
        const res = await fetch(`/api/cashflow?date=${dateStr}`);
        const data = await res.json();
        setCashFlowData(data[0] || { date: selectedDate });
      } else if (activeTab === "sales") {
        const res = await fetch(`/api/sales?date=${dateStr}`);
        const data = await res.json();
        setSalesData(data || []);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setIsDirty(false);
  }, [selectedDate, activeTab]);

  async function handleSave() {
    if (!isEditable) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const endpoint = `/api/${activeTab}`;
      let body: any = {};

      if (activeTab === "production") {
        body = { ...productionData, date: format(selectedDate, "yyyy-MM-dd") };
      } else if (activeTab === "cashflow") {
        body = { ...cashFlowData, date: format(selectedDate, "yyyy-MM-dd") };
      } else if (activeTab === "sales") {
        body = { ...newSale, date: format(selectedDate, "yyyy-MM-dd") };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }
        if (activeTab === "sales") setNewSale({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });

        fetchData();

        setTimeout(() => {
          setIsDirty(false);
          setSuccess(false);
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    } catch (err) {
      setError("Network error");
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="space-y-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">
              {activeTab === "production" ? "Entri Produksi" : activeTab === "cashflow" ? "Arus Kas" : activeTab === "sales" ? "Penjualan" : "Data Master"}
            </h1>
            <p className={cn("text-sm", isEditable ? "text-slate-500" : "text-amber-600 font-bold flex items-center gap-1")}>
              {isEditable ? "Update catatan harian" : <><AlertCircle className="w-4 h-4" /> Baca-saja: Riwayat</>}
            </p>
          </div>
        </div>

        {activeTab !== "master" && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {last7Days.map((date) => {
              const isActive = isSameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex flex-col items-center min-w-[64px] py-3 rounded-2xl transition-all active:scale-90",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-white border border-slate-100 text-slate-500"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{format(date, "EEE")}</span>
                  <span className="text-lg font-black">{format(date, "d")}</span>
                </button>
              );
            })}
            <div className="relative group">
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-16 h-[72px] flex items-center justify-center bg-slate-100 rounded-2xl text-slate-400 group-hover:text-blue-500 transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: "production", icon: TrendingUp, label: "Produksi" },
          { id: "cashflow", icon: Wallet, label: "Arus Kas" },
          { id: "sales", icon: ShoppingBag, label: "Penjualan" },
          { id: "master", icon: Settings2, label: "Data Master" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center",
              activeTab === t.id 
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          Data saved successfully
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-400 font-medium">Fetching details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "production" && (
            <ProductionForm
              data={productionData}
              setData={(d: ProductionData) => { setProductionData(d); setIsDirty(true); }}
              isEditable={isEditable}
              showDetails={showFinancialDetails}
              setShowDetails={setShowFinancialDetails}
            />
          )}
          {activeTab === "cashflow" && (
            <CashFlowForm
              data={cashFlowData}
              setData={(d: CashFlowData) => { setCashFlowData(d); setIsDirty(true); }}
              isEditable={isEditable}
            />
          )}
          {activeTab === "sales" && (
            <SalesSection
              data={salesData}
              newSale={newSale}
              setNewSale={setNewSale}
              isEditable={isEditable}
              onSave={handleSave}
            />
          )}
          {activeTab === "master" && <MasterForm data={masterData} onSave={fetchData} />}
        </div>
      )}

      {/* Persistent Save Bar for non-transactional tabs */}
      {isEditable && (activeTab === "production" || activeTab === "cashflow") && (
        <div className={cn(
          "fixed left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-slate-900 text-white rounded-[32px] shadow-2xl p-4 flex items-center justify-between z-40 transition-all duration-500",
          isDirty ? "bottom-24 sm:bottom-10 opacity-100" : "-bottom-40 opacity-0"
        )}>
          <div className="hidden sm:flex items-center gap-4 pl-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</p>
              <h4 className="text-sm font-black italic">Ada perubahan yang belum disimpan</h4>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {success ? (
              <CheckCircle2 className="w-5 h-5 animate-in zoom-in" />
            ) : saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {success ? "Berhasil Disimpan!" : "Simpan Perubahan"}
          </button>
        </div>
      )}
    </div>
  );
}

interface FormProps<T> {
  data: T;
  setData: (data: T) => void;
  isEditable: boolean;
}

interface ProductionFormProps extends FormProps<ProductionData> {
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}

function ProductionForm({ data, setData, isEditable, showDetails, setShowDetails }: ProductionFormProps) {
  const updateField = (field: string, val: string) => {
    if (!isEditable) return;
    setData({ ...data, [field]: parseFloat(val) || 0 });
  };

  const isAtLeastOneCageDone = CATS.some(cat =>
    data[`${cat}JmlTelur`] || data[`${cat}Kg`] || data[`${cat}Pct`] || data[`${cat}Fc`]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {CATS.map((cat) => (
        <CageCard
          key={cat}
          cat={cat}
          data={data}
          updateField={updateField}
          isEditable={isEditable}
        />
      ))}

      {isAtLeastOneCageDone && (
        <div className={cn(
          "md:col-span-2 transition-all duration-500",
          showDetails ? "bg-blue-600 p-8 rounded-[32px]" : "bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                showDetails ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
              )}>
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className={cn("text-xl font-black tracking-tight", showDetails ? "text-white" : "text-slate-900")}>Daily Financial Summary</h3>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                showDetails ? "bg-white text-blue-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {showDetails ? "Sembunyikan" : "Lihat Detail"}
              {showDetails ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {showDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <InputField dark label="Harga Sentral" value={data.hargaSentral} onChange={(v: string) => updateField(`hargaSentral`, v)} readOnly={!isEditable} />
              <InputField dark label="UP" value={data.up} onChange={(v: string) => updateField(`up`, v)} readOnly={!isEditable} />
              <InputField dark label="Operasional" value={data.operasional} onChange={(v: string) => updateField(`operasional`, v)} readOnly={!isEditable} />
              <div className="space-y-1.5 flex-1">
                <label className="text-[9px] uppercase font-black tracking-[0.2em] px-1 text-white/50">Daily Profit</label>
                <div className="w-full px-5 py-4 rounded-2xl bg-white/10 border border-white/5 text-white text-lg font-black font-jetbrains">
                  Rp {Math.round(data.profitDaily || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CageCardProps {
  cat: string;
  data: ProductionData;
  updateField: (field: string, val: string) => void;
  isEditable: boolean;
}

function CageCard({ cat, data, updateField, isEditable }: CageCardProps) {
  const fields = ["JmlTelur", "Kg", "Pct", "Fc"];
  const labels = ["Jml Telur", "Kg", "%", "FC"];

  const filledCount = fields.filter(f => data[`${cat}${f}`]).length;
  const progress = (filledCount / fields.length) * 100;

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleNext = (index: number) => {
    if (index < fields.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className={cn(
      "p-6 rounded-[32px] border transition-all duration-500 relative overflow-hidden group active-scale",
      !isEditable ? "bg-slate-50 border-slate-200 opacity-60 grayscale-[0.5]" : "bg-white border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] hover:border-blue-200"
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors",
            progress === 100 ? "bg-emerald-500 text-white" : "bg-blue-50 text-blue-600"
          )}>
            {CATEGORY_MAP[cat]}
          </div>
          <h3 className="text-lg font-black text-slate-900">Cage {CATEGORY_MAP[cat]}</h3>
        </div>

        {/* Progress Ring */}
        <div className="relative w-10 h-10">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
            <circle
              cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={100}
              strokeDashoffset={100 - progress}
              className={cn("transition-all duration-700", progress === 100 ? "text-emerald-500" : "text-blue-500")}
              style={{ strokeDashoffset: `${100 - progress}` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-[8px] font-black", progress === 100 ? "text-emerald-500" : "text-slate-400")}>
              {progress === 100 ? "✓" : `${progress}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((f, i) => (
          <InputField
            key={f}
            ref={(el: HTMLInputElement | null) => { inputRefs.current[i] = el; }}
            label={labels[i]}
            value={data[`${cat}${f}`]}
            onChange={(v: string) => updateField(`${cat}${f}`, v)}
            readOnly={!isEditable}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') handleNext(i);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CashFlowForm({ data, setData, isEditable }: FormProps<CashFlowData>) {
  const updateField = (field: keyof CashFlowData, val: string) => {
    if (!isEditable) return;
    setData({ ...data, [field]: parseFloat(val) || 0 });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-500" />
          Primary Expenses
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InputField label="Total Penjualan" value={data.totalPenjualan} onChange={(v: string) => updateField(`totalPenjualan`, v)} readOnly={!isEditable} />
          <InputField label="Biaya Pakan" value={data.biayaPakan} onChange={(v: string) => updateField(`biayaPakan`, v)} readOnly={!isEditable} />
          <InputField label="Operasional" value={data.biayaOperasional} onChange={(v: string) => updateField(`biayaOperasional`, v)} readOnly={!isEditable} />
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl text-white">
        <h3 className="text-xl font-black mb-6">Salaries (Gaji)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <InputField dark label="Bepuk" value={data.gajiBepuk} onChange={(v: string) => updateField(`gajiBepuk`, v)} readOnly={!isEditable} />
          <InputField dark label="Barman" value={data.gajiBarman} onChange={(v: string) => updateField(`gajiBarman`, v)} readOnly={!isEditable} />
          <InputField dark label="Agung" value={data.gajiAgung} onChange={(v: string) => updateField(`gajiAgung`, v)} readOnly={!isEditable} />
          <InputField dark label="Eki" value={data.gajiEki} onChange={(v: string) => updateField(`gajiEki`, v)} readOnly={!isEditable} />
          <InputField dark label="Adi" value={data.gajiAdi} onChange={(v: string) => updateField(`gajiAdi`, v)} readOnly={!isEditable} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Balances & Dividends</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <InputField label="Deviden A" value={data.devidenA} onChange={(v: string) => updateField(`devidenA`, v)} readOnly={!isEditable} />
          <InputField label="Deviden B" value={data.devidenB} onChange={(v: string) => updateField(`devidenB`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Rekening" value={data.saldoKas} onChange={(v: string) => updateField(`saldoKas`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Cash" value={data.saldoCash} onChange={(v: string) => updateField(`saldoCash`, v)} readOnly={!isEditable} />
        </div>
      </div>
    </div>
  );
}

interface SalesSectionProps {
  data: SaleData[];
  newSale: Partial<SaleData>;
  setNewSale: (sale: Partial<SaleData>) => void;
  isEditable: boolean;
  onSave: () => void;
}

function SalesSection({ data, newSale, setNewSale, isEditable, onSave }: SalesSectionProps) {
  return (
    <div className="space-y-6">
      {isEditable && (
        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
          <h3 className="text-xl font-black text-blue-900 mb-6">Entri Penjualan Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-blue-400 tracking-widest px-1">Customer</label>
              <input 
                type="text" 
                placeholder="Name"
                value={newSale.customerName}
                onChange={(e) => setNewSale({...newSale, customerName: e.target.value})}
                className="w-full px-5 py-4 bg-white border border-blue-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <InputField label="Peti" value={newSale.jmlPeti} onChange={(v: string) => setNewSale({...newSale, jmlPeti: parseFloat(v) || 0})} />
            <InputField label="Total Kg" value={newSale.totalKg} onChange={(v: string) => setNewSale({...newSale, totalKg: parseFloat(v) || 0})} />
            <InputField label="Harga Jual" value={newSale.hargaJual} onChange={(v: string) => setNewSale({...newSale, hargaJual: parseFloat(v) || 0})} />
          </div>
          <button 
            onClick={onSave}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            Add Sale Record
          </button>
        </div>
      )}

      {data.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Transaksi Hari Ini</h3>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              {data.length} Records
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data.map((sale) => (
              <div key={sale.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight">{sale.customerName}</h4>
                  <p className="text-xs text-slate-400 font-bold">{sale.jmlPeti} Peti • {sale.totalKg} KG</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 italic">Rp {sale.hargaJual.toLocaleString()}</p>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Total: Rp {sale.subTotal.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Tidak ada penjualan tercatat untuk tanggal ini</p>
        </div>
      )}
    </div>
  );
}

interface MasterFormProps {
  data: any[];
  onSave: () => void;
}

function MasterForm({ data, onSave }: MasterFormProps) {
  const [editing, setEditing] = useState<any>(null);

  const handleEdit = (item: any) => {
    setEditing({ ...item });
  };

  const handleSaveMaster = async () => {
    const res = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setEditing(null);
      onSave();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((item: any) => (
        <div key={item.kandang} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
              {item.kandang}
            </div>
            <div>
              <h4 className="font-black text-slate-900">Cage {item.kandang}</h4>
              <p className="text-xs text-slate-400 font-bold">{item.jmlAyam.toLocaleString()} Chickens</p>
            </div>
          </div>
          <button 
            onClick={() => handleEdit(item)}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-blue-600"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      ))}
      
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-10 py-8 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-900">Edit {editing.kandang}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <InputField label="Jml Ayam" value={editing.jmlAyam} onChange={(v: string) => setEditing({...editing, jmlAyam: parseInt(v) || 0})} />
                <InputField label="Gram/Ekor" value={editing.gramEkor} onChange={(v: string) => setEditing({...editing, gramEkor: parseFloat(v) || 0})} />
                <InputField label="Jml Ember" value={editing.jmlEmber} onChange={(v: string) => setEditing({...editing, jmlEmber: parseFloat(v) || 0})} />
                <InputField label="Jml Pakan" value={editing.jmlPakan} onChange={(v: string) => setEditing({...editing, jmlPakan: parseFloat(v) || 0})} />
              </div>
              <button 
                onClick={handleSaveMaster}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[25px] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10"
              >
                Save Master Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: any;
  onChange: (val: string) => void;
  readOnly?: boolean;
  dark?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({ label, value, onChange, readOnly, dark, onKeyDown }, ref) => {
  const displayValue = useMemo(() => {
    if (value == null || value === "") return "";
    const strVal = String(value).replace(/,/g, "");
    const num = parseFloat(strVal);
    if (isNaN(num)) return value;
    return num.toLocaleString("en-US");
  }, [value]);

  return (
    <div className="space-y-1.5 flex-1">
      <label className={cn("text-[9px] uppercase font-black tracking-[0.2em] px-1", dark ? "text-blue-200/50" : "text-slate-400")}>
        {label}
      </label>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/,/g, "");
          onChange(cleaned);
        }}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        className={cn(
          "w-full px-5 py-4 rounded-2xl text-lg font-black outline-none transition-all font-jetbrains",
          dark
            ? "bg-white/10 border-white/5 text-white placeholder-white/20 focus:bg-white/20"
            : "bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200"
        )}
        placeholder="0"
      />
    </div>
  );
});

InputField.displayName = "InputField";
