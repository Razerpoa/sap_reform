"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, startOfDay } from "date-fns";
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar,
  Layers,
  ShoppingBag,
  Wallet,
  Settings2,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "production" | "master" | "cashflow" | "sales";

const CATS = ["b1", "b1p", "b2", "b2p", "b3", "b3p"];
const CATEGORY_MAP: Record<string, string> = {
  b1: "B1", b1p: "B1+", b2: "B2", b2p: "B2+", b3: "B3", b3p: "B3+"
};

export default function EntryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("production");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form States
  const [productionData, setProductionData] = useState<any>({});
  const [masterData, setMasterData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any>({ date: new Date() });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [newSale, setNewSale] = useState<any>({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });

  const isEditable = useMemo(() => {
    if (activeTab === "master") return true; // Master info is always editable by design choice (rarely changes)
    return isToday(selectedDate);
  }, [selectedDate, activeTab]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  async function fetchData() {
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
  }

  async function handleSave() {
    if (!isEditable) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let endpoint = `/api/${activeTab}`;
      let body: any = {};

      if (activeTab === "production") {
        body = { ...productionData, date: format(selectedDate, "yyyy-MM-dd") };
      } else if (activeTab === "cashflow") {
        body = { ...cashFlowData, date: format(selectedDate, "yyyy-MM-dd") };
      } else if (activeTab === "sales") {
        // Sales are usually handled per-entry, but for simplicity we can add/edit
        body = { ...newSale, date: format(selectedDate, "yyyy-MM-dd") };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        if (activeTab === "sales") setNewSale({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });
        fetchData();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab} Entry</h1>
          <p className={cn("text-sm", isEditable ? "text-slate-500" : "text-amber-600 font-bold flex items-center gap-1")}>
            {isEditable ? "Update daily records" : <><AlertCircle className="w-4 h-4" /> Read-only: History</>}
          </p>
        </div>
        
        {activeTab !== "master" && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input 
              type="date" 
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="text-sm font-bold outline-none bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: "production", icon: TrendingUp, label: "Production" },
          { id: "cashflow", icon: Wallet, label: "Cash Flow" },
          { id: "sales", icon: ShoppingBag, label: "Sales" },
          { id: "master", icon: Settings2, label: "Master" },
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
          {activeTab === "production" && <ProductionForm data={productionData} setData={setProductionData} isEditable={isEditable} />}
          {activeTab === "cashflow" && <CashFlowForm data={cashFlowData} setData={setCashFlowData} isEditable={isEditable} />}
          {activeTab === "sales" && <SalesSection data={salesData} newSale={newSale} setNewSale={setNewSale} isEditable={isEditable} onSave={handleSave} />}
          {activeTab === "master" && <MasterForm data={masterData} onSave={fetchData} />}
        </div>
      )}

      {/* Persistent Save Bar for non-transactional tabs */}
      {isEditable && (activeTab === "production" || activeTab === "cashflow") && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl p-5 flex items-center justify-between z-40">
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase font-black text-slate-400">Status</p>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Drafting {activeTab}
            </h4>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Information
          </button>
        </div>
      )}
    </div>
  );
}

function ProductionForm({ data, setData, isEditable }: any) {
  const updateField = (field: string, val: string) => {
    if (!isEditable) return;
    setData({ ...data, [field]: parseFloat(val) || 0 });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {CATS.map((cat) => (
        <div key={cat} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                {CATEGORY_MAP[cat]}
              </div>
              <h3 className="text-lg font-black text-slate-900">Cage {CATEGORY_MAP[cat]}</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Jml Telur" value={data[`${cat}JmlTelur`]} onChange={(v: string) => updateField(`${cat}JmlTelur`, v)} readOnly={!isEditable} />
            <InputField label="Kg" value={data[`${cat}Kg`]} onChange={(v: string) => updateField(`${cat}Kg`, v)} readOnly={!isEditable} />
            <InputField label="%" value={data[`${cat}Pct`]} onChange={(v: string) => updateField(`${cat}Pct`, v)} readOnly={!isEditable} />
            <InputField label="FC" value={data[`${cat}Fc`]} onChange={(v: string) => updateField(`${cat}Fc`, v)} readOnly={!isEditable} />
          </div>
        </div>
      ))}
      <div className="bg-blue-600 p-8 rounded-3xl text-white md:col-span-2">
        <h3 className="text-xl font-black mb-6">Daily Financial Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <InputField dark label="Harga Sentral" value={data.hargaSentral} onChange={(v: string) => updateField(`hargaSentral`, v)} readOnly={!isEditable} />
          <InputField dark label="UP" value={data.up} onChange={(v: string) => updateField(`up`, v)} readOnly={!isEditable} />
          <InputField dark label="Operasional" value={data.operasional} onChange={(v: string) => updateField(`operasional`, v)} readOnly={!isEditable} />
          <InputField dark label="Daily Profit" value={data.profitDaily} onChange={(v: string) => updateField(`profitDaily`, v)} readOnly={!isEditable} />
        </div>
      </div>
    </div>
  );
}

function CashFlowForm({ data, setData, isEditable }: any) {
  const updateField = (field: string, val: string) => {
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
          <InputField label="Saldo Kas" value={data.saldoKas} onChange={(v: string) => updateField(`saldoKas`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Cash" value={data.saldoCash} onChange={(v: string) => updateField(`saldoCash`, v)} readOnly={!isEditable} />
        </div>
      </div>
    </div>
  );
}

function SalesSection({ data, newSale, setNewSale, isEditable, onSave }: any) {
  return (
    <div className="space-y-6">
      {isEditable && (
        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
          <h3 className="text-xl font-black text-blue-900 mb-6">Record New Sale</h3>
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
            <h3 className="font-black text-slate-900">Today's Transactions</h3>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              {data.length} Records
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data.map((sale: any) => (
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
          <p className="text-slate-400 font-bold">No sales recorded for this date</p>
        </div>
      )}
    </div>
  );
}

function MasterForm({ data, onSave }: any) {
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

function InputField({ label, value, onChange, readOnly, dark }: any) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className={cn("text-[9px] uppercase font-black tracking-[0.2em] px-1", dark ? "text-blue-200/50" : "text-slate-400")}>
        {label}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={cn(
          "w-full px-5 py-4 rounded-2xl text-lg font-black outline-none transition-all",
          dark 
            ? "bg-white/10 border-white/5 text-white placeholder-white/20 focus:bg-white/20" 
            : "bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200"
        )}
        placeholder="0.0"
      />
    </div>
  );
}
