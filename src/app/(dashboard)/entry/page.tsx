"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { getWIBDateString } from "@/lib/date-utils";
import { useSession } from "next-auth/react";
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
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

type Tab = "production" | "master" | "cashflow" | "sales";

const CATS = ["b1", "b1p", "b2", "b2p", "b3", "b3p"];
const CATEGORY_MAP: Record<string, string> = {
  b1: "B1", b1p: "B1+", b2: "B2", b2p: "B2+", b3: "B3", b3p: "B3+"
};

export default function EntryPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("production");
  const [selectedDate, setSelectedDate] = useState(getWIBDateString());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form States
  const [productionData, setProductionData] = useState<any>({});
  const [masterData, setMasterData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any>({ date: new Date() });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<any[]>([]);
  const [newSale, setNewSale] = useState<any>({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });
  const [newExpense, setNewExpense] = useState<any>({ amount: 0, description: "" });
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const isEditable = useMemo(() => {
    if (activeTab === "master") return true;
    // Use consistent WIB-based today check
    const dateStr = selectedDate;
    return dateStr === getWIBDateString();
  }, [selectedDate, activeTab]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    const dateStr = selectedDate;
    // Cache buster - proper URL construction
    const ts = Date.now();

    try {
      if (activeTab === "production") {
        const res = await fetch(`/api/production?date=${dateStr}&_t=${ts}`);
        if (!res.ok) throw new Error("production failed");
        const data = await res.json();
        setProductionData(data || {});
      } else if (activeTab === "master") {
        // Master doesn't require auth in same way - just try to load
        try {
          const res = await fetch(`/api/master?_t=${ts}`);
          const data = await res.json();
          setMasterData(Array.isArray(data) ? data : []);
        } catch {
          setMasterData([]); // Show empty form on error
        }
      } else if (activeTab === "cashflow") {
        const res = await fetch(`/api/cashflow?date=${dateStr}&_t=${ts}`);
        const data = await res.json();
        setCashFlowData(data[0] || { date: new Date(selectedDate) });
      } else if (activeTab === "sales") {
        const res = await fetch(`/api/sales?date=${dateStr}&_t=${ts}`);
        const data = await res.json();
        setSalesData(data || []);
      } else if (activeTab === "cashflow") {
        // Fetch both cashflow and other expenses
        const [cashflowRes, expensesRes] = await Promise.all([
          fetch(`/api/cashflow?date=${dateStr}&_t=${ts}`),
          fetch(`/api/expense?date=${dateStr}&_t=${ts}`),
        ]);
        const cashflowData = await cashflowRes.json();
        const expensesData = await expensesRes.json();
        setCashFlowData(cashflowData[0] || { date: new Date(selectedDate) });
        setOtherExpenses(Array.isArray(expensesData) ? expensesData : []);
      }
    } catch (err: any) {
      console.error("[fetchData] error:", err);
      setError(err.message || "Failed to load data");
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
        body = { ...productionData, date: selectedDate };
      } else if (activeTab === "cashflow") {
        body = { ...cashFlowData, date: selectedDate };
      } else if (activeTab === "sales") {
        body = { ...newSale, date: selectedDate };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        if (activeTab === "sales") setNewSale({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0 });
        
        // Small delay to ensure server revalidates, then refresh form data
        await new Promise(r => setTimeout(r, 100));
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">
            {activeTab === "production" ? "Entri Produksi" : activeTab === "cashflow" ? "Arus Kas" : activeTab === "sales" ? "Penjualan" : "Data Master"}
          </h1>
          <p className={cn("text-sm", isEditable ? "text-slate-500" : "text-amber-600 font-bold flex items-center gap-1")}>
            {isEditable ? "Update catatan harian" : <><AlertCircle className="w-4 h-4" /> Baca-saja: Riwayat</>}
          </p>
        </div>
        
        {activeTab !== "master" && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker();
                } catch (error) {
                  console.log("Browser does not support showPicker");
                }
              }}
              className="text-sm font-bold outline-none bg-transparent"
            />
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
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
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
          {activeTab === "cashflow" && <CashFlowForm data={cashFlowData} setData={setCashFlowData} isEditable={isEditable} otherExpenses={otherExpenses} setOtherExpenses={setOtherExpenses} newExpense={newExpense} setNewExpense={setNewExpense} editingExpense={editingExpense} setEditingExpense={setEditingExpense} selectedDate={selectedDate} />}
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
            Simpan Informasi
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
        <div key={cat} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                {CATEGORY_MAP[cat]}
              </div>
              <h3 className="text-lg font-black text-slate-900">Kandang {CATEGORY_MAP[cat]}</h3>
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
      <div className="bg-blue-600 p-6 sm:p-8 rounded-2xl text-white md:col-span-2">
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

function CashFlowForm({ data, setData, isEditable, otherExpenses, setOtherExpenses, newExpense, setNewExpense, editingExpense, setEditingExpense, selectedDate }: any) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const res = await fetch("/api/workers", {
          credentials: "include",
        });
        if (res.ok) {
          const workerList = await res.json();
          setWorkers(workerList);
        } else {
          console.error("Failed to fetch workers:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch workers:", err);
      } finally {
        setWorkersLoading(false);
      }
    }
    fetchWorkers();
  }, []);

  const updateField = (field: string, val: string) => {
    if (!isEditable) return;
    setData({ ...data, [field]: parseFloat(val) || 0 });
  };

  const updateSalary = (workerId: string, val: string) => {
    if (!isEditable) return;
    const salary = parseFloat(val) || 0;
    const currentSalaries = data.salaries || {};
    const newSalaries = { ...currentSalaries };
    
    if (salary > 0) {
      newSalaries[workerId] = salary;
    } else {
      delete newSalaries[workerId];
    }
    
    setData({ ...data, salaries: newSalaries });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-500" />
          Pengeluaran Utama
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InputField label="Total Penjualan" value={data.totalPenjualan} onChange={(v: string) => updateField(`totalPenjualan`, v)} readOnly={!isEditable} />
          <InputField label="Biaya Pakan" value={data.biayaPakan} onChange={(v: string) => updateField(`biayaPakan`, v)} readOnly={!isEditable} />
          <InputField label="Operasional" value={data.biayaOperasional} onChange={(v: string) => updateField(`biayaOperasional`, v)} readOnly={!isEditable} />
        </div>
      </div>

      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl text-white">
        <h3 className="text-xl font-black mb-6">Salaries (Gaji)</h3>
        {workersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : workers.length > 0 ? (
          <div className={`grid gap-4 ${workers.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : workers.length <= 5 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
            {workers.map((worker) => (
              <InputField 
                key={worker.id}
                dark 
                label={worker.name} 
                value={data.salaries?.[worker.id] || 0} 
                onChange={(v: string) => updateSalary(worker.id, v)} 
                readOnly={!isEditable} 
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-300 text-sm">No workers configured</p>
        )}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Balances & Dividends</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <InputField label="Deviden A" value={data.devidenA} onChange={(v: string) => updateField(`devidenA`, v)} readOnly={!isEditable} />
          <InputField label="Deviden B" value={data.devidenB} onChange={(v: string) => updateField(`devidenB`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Rekening" value={data.saldoKas} onChange={(v: string) => updateField(`saldoKas`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Cash" value={data.saldoCash} onChange={(v: string) => updateField(`saldoCash`, v)} readOnly={!isEditable} />
        </div>
      </div>

      {/* Other Expenses Section */}
      <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-100">
        <h3 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          Pengeluaran Lain
        </h3>
        
        {/* Add/Edit Form */}
        {isEditable && (
          <div className="bg-white p-4 rounded-xl border border-blue-100 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest px-1">Jumlah (Rp)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="0"
                  value={editingExpense ? editingExpense.amount?.toLocaleString("en-US") : newExpense.amount?.toLocaleString("en-US")}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/,/g, "");
                    const val = parseFloat(cleaned) || 0;
                    if (editingExpense) {
                      setEditingExpense({ ...editingExpense, amount: val });
                    } else {
                      setNewExpense({ ...newExpense, amount: val });
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest px-1">Keterangan</label>
                <input 
                  type="text" 
                  placeholder="Deskripsi pengeluaran..."
                  value={editingExpense ? editingExpense.description : newExpense.description}
                  onChange={(e) => {
                    if (editingExpense) {
                      setEditingExpense({ ...editingExpense, description: e.target.value });
                    } else {
                      setNewExpense({ ...newExpense, description: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const expense = editingExpense || newExpense;
                  if (!expense.amount || !expense.description) {
                    setExpenseError("Mohon isi jumlah dan keterangan");
                    return;
                  }
                  setSavingExpense(true);
                  setExpenseError(null);
                  try {
                    const res = await fetch("/api/expense", {
                      method: editingExpense?.id ? "PUT" : "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...expense,
                        date: selectedDate,
                      }),
                    });
                    if (res.ok) {
                      setExpenseSuccess(true);
                      setNewExpense({ amount: 0, description: "" });
                      setEditingExpense(null);
                      // Refresh data
                      const ts = Date.now();
                      const expRes = await fetch(`/api/expense?date=${selectedDate}&_t=${ts}`);
                      const expData = await expRes.json();
                      setOtherExpenses(Array.isArray(expData) ? expData : []);
                      setTimeout(() => setExpenseSuccess(false), 2000);
                    } else {
                      const err = await res.json();
                      setExpenseError(err.error || "Failed to save");
                    }
                  } catch {
                    setExpenseError("Network error");
                  } finally {
                    setSavingExpense(false);
                  }
                }}
                disabled={savingExpense}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {savingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : editingExpense ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingExpense ? "Update" : "Tambah Pengeluaran"}
              </button>
              {editingExpense && (
                <button
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {expenseError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {expenseError}
          </div>
        )}
        {expenseSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Pengeluaran berhasil disimpan
          </div>
        )}

        {/* Expenses List */}
        {otherExpenses.length > 0 ? (
          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
            <div className="divide-y divide-blue-50">
              {otherExpenses.map((expense: any) => (
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                  <div>
                    <h4 className="font-black text-slate-900">{expense.description}</h4>
                    <p className="text-xs text-slate-400 font-medium">{new Date(expense.date).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-blue-700 italic">{formatNumber(expense.amount)}</p>
                    {isEditable && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Hapus pengeluaran ini?")) return;
                            try {
                              const res = await fetch(`/api/expense?id=${expense.id}`, { method: "DELETE" });
                              if (res.ok) {
                                const ts = Date.now();
                                const expRes = await fetch(`/api/expense?date=${selectedDate}&_t=${ts}`);
                                const expData = await expRes.json();
                                setOtherExpenses(Array.isArray(expData) ? expData : []);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-white rounded-xl border border-dashed border-blue-200">
            <Wallet className="w-8 h-8 text-blue-200 mx-auto mb-2" />
            <p className="text-blue-600 font-medium text-sm">Belum ada pengeluaran lain hari ini</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesSection({ data, newSale, setNewSale, isEditable, onSave }: any) {
  return (
    <div className="space-y-6">
      {isEditable && (
        <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-100">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Transaksi Hari Ini</h3>
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
                  <p className="text-lg font-black text-slate-900 italic">{formatNumber(sale.hargaJual)}</p>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Total: {formatNumber(sale.subTotal)}</p>
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

function MasterForm({ data, onSave }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCage, setNewCage] = useState({ kandang: "", jmlAyam: 0, jmlEmber: 0, jmlPakan: 0, hargaPakan: 7300 });
  const { data: session } = useSession();
  
  const userEmail = session?.user?.email || "";
  const isSuperAdmin = process.env.SUPER_ADMIN_EMAIL?.includes(userEmail) || false;

  const handleEdit = (item: any) => {
    setEditing({ ...item });
  };

  const handleSaveMaster = async () => {
    // Auto-calculate jmlPakan = jmlEmber * faktorPakan before saving
    // Subtract mortality from jmlAyam before saving
    const jmlEmber = parseFloat(editing.jmlEmber) || 0;
    const faktorPakan = parseFloat(editing.faktorPakan) || 13;
    const mortality = parseInt(editing.mortality) || 0;
    const originalJmlAyam = parseInt(editing.jmlAyam) || 0;
    const newJmlAyam = originalJmlAyam - mortality;
    const calculatedData = {
      ...editing,
      jmlAyam: newJmlAyam,
      jmlEmber,
      faktorPakan,
      jmlPakan: jmlEmber * faktorPakan,
      mortality,
    };
    console.log('[MasterForm] Saving:', JSON.stringify(calculatedData));
    const res = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calculatedData),
    });
    console.log('[MasterForm] Response:', res.status, await res.text());
    if (res.ok) {
      setEditing(null);
      onSave();
    }
  };

  const handleAddNew = async () => {
    if (!newCage.kandang.trim()) return;
    const jmlEmber = parseFloat(String(newCage.jmlEmber)) || 0;
    const faktorPakan = 13; // default
    const calculatedData = {
      ...newCage,
      jmlAyam: parseInt(String(newCage.jmlAyam)) || 0,
      jmlEmber,
      faktorPakan,
      jmlPakan: jmlEmber * faktorPakan,
    };
    const res = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calculatedData),
    });
    if (res.ok) {
      setIsAddingNew(false);
      setNewCage({ kandang: "", jmlAyam: 0, jmlEmber: 0, jmlPakan: 0, hargaPakan: 7300 });
      onSave();
    }
  };

  const handleDelete = async (kandang: string) => {
    if (!confirm(`Delete ${kandang}?`)) return;
    const res = await fetch(`/api/master?kandang=${encodeURIComponent(kandang)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onSave();
    }
  };

  const handleEmberChange = (value: string) => {
    const newJmlEmber = parseFloat(value) || 0;
    const faktorPakan = parseFloat(String(editing.faktorPakan)) || 13;
    const jmlAyam = parseInt(String(editing.jmlAyam)) || 0;
    const jmlPakan = newJmlEmber * faktorPakan;
    const gramEkor = jmlAyam > 0 ? jmlPakan / jmlAyam : 0;
    const hargaPakan = parseFloat(String(editing.hargaPakan)) || 0;
    const beratPakan = jmlPakan * hargaPakan;
    const volEmber = newJmlEmber > 0 ? jmlPakan / newJmlEmber : 0;
    setEditing({
      ...editing,
      jmlEmber: newJmlEmber,
      jmlPakan,
      gramEkor,
      beratPakan,
      volEmber,
    });
  };

  const handleFaktorPakanChange = (value: string) => {
    const newFaktorPakan = parseFloat(value) || 13;
    const jmlEmber = parseFloat(String(editing.jmlEmber)) || 0;
    const jmlAyam = parseInt(String(editing.jmlAyam)) || 0;
    const jmlPakan = jmlEmber * newFaktorPakan;
    const gramEkor = jmlAyam > 0 ? jmlPakan / jmlAyam : 0;
    const hargaPakan = parseFloat(String(editing.hargaPakan)) || 0;
    const beratPakan = jmlPakan * hargaPakan;
    const volEmber = jmlEmber > 0 ? jmlPakan / jmlEmber : 0;
    setEditing({
      ...editing,
      faktorPakan: newFaktorPakan,
      jmlPakan,
      gramEkor,
      beratPakan,
      volEmber,
    });
  };

  // Calculate preview fields for new cage
  const previewFields = (() => {
    const jmlAyam = parseInt(String(newCage.jmlAyam)) || 0;
    const jmlEmber = parseFloat(String(newCage.jmlEmber)) || 0;
    const jmlPakan = jmlEmber * 13;
    const gramEkor = jmlAyam > 0 ? jmlPakan / jmlAyam : 0;
    const beratPakan = jmlPakan * (parseFloat(String(newCage.hargaPakan)) || 0);
    const volEmber = jmlEmber > 0 ? jmlPakan / jmlEmber : 0;
    return { jmlPakan, gramEkor, beratPakan, volEmber };
  })();

  return (
    <div className="space-y-3">
      {/* Add New Cage Button */}
      {isSuperAdmin && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-black hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Cage Group
        </button>
      )}

      {/* Add New Cage Form */}
      {isAddingNew && (
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-slate-900">New Cage Group</h4>
            <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <InputField label="Kandang" value={newCage.kandang} onChange={(v: string) => setNewCage({...newCage, kandang: v.toUpperCase()})} placeholder="B4" />
            <InputField label="Jml Ayam" value={newCage.jmlAyam} onChange={(v: string) => setNewCage({...newCage, jmlAyam: parseInt(v) || 0})} />
            <InputField label="Jml Ember" value={newCage.jmlEmber} onChange={(v: string) => setNewCage({...newCage, jmlEmber: parseFloat(v) || 0})} />
            <InputField label="H. Pakan" value={newCage.hargaPakan} onChange={(v: string) => setNewCage({...newCage, hargaPakan: parseFloat(v) || 0})} />
          </div>
          {/* Calculated Preview */}
          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Calculated Values</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-slate-400">Jml Pakan</p>
                <p className="text-lg font-black text-slate-900">{previewFields.jmlPakan.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-slate-400">G/Ekor</p>
                <p className="text-lg font-black text-slate-900">{previewFields.gramEkor.toFixed(3)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-slate-400">B Pakan</p>
                <p className="text-lg font-black text-slate-900">{previewFields.beratPakan.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-slate-400">Vol/Ember</p>
                <p className="text-lg font-black text-slate-900">{previewFields.volEmber.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsAddingNew(false)} className="flex-1 py-2 border border-slate-200 rounded-lg font-black text-slate-600 text-sm">Cancel</button>
            <button onClick={handleAddNew} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-500">Add Cage</button>
          </div>
        </div>
      )}

      {/* Existing Cage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((item: any) => (
          <div key={item.id || item.kandang} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm group-hover:bg-blue-600 transition-colors">
                  {item.kandang}
                </div>
                <div>
                  <h4 className="font-black text-slate-900">Kandang {item.kandang}</h4>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleDelete(item.kandang)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Jml Ayam</p>
                <p className="text-lg font-black text-slate-900">{item.jmlAyam?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Mortalities</p>
                <p className="text-lg font-black text-slate-900">{item.mortality?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Jml Ember</p>
                <p className="text-lg font-black text-slate-900">{item.jmlEmber?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Jml Pakan</p>
                <p className="text-lg font-black text-slate-900">{item.jmlPakan?.toLocaleString() || 0}</p>
              </div>
              {/* Calculated fields display */}
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-blue-400 tracking-wider">G/Ekor</p>
                <p className="text-base font-black text-blue-600">{item.gramEkor?.toFixed(3) || "0.000"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-blue-400 tracking-wider">B Pakan</p>
                <p className="text-base font-black text-blue-600">{item.beratPakan?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-blue-400 tracking-wider">Vol/Ember</p>
                <p className="text-base font-black text-blue-600">{item.volEmber?.toFixed(1) || "0.0"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-blue-400 tracking-wider">H. Pakan</p>
                <p className="text-base font-black text-blue-600">{item.hargaPakan?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-2 py-3 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Edit {editing.kandang}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <p className="col-span-2 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-100 pb-1">Input Data</p>
                <InputField label="Jml Ayam" value={editing.jmlAyam} onChange={(v: string) => setEditing({...editing, jmlAyam: parseInt(v) || 0})} />
                <InputField label="Mortalities" value={editing.mortality} onChange={(v: string) => setEditing({...editing, mortality: parseInt(v) || 0})} />
                <InputField label="Jml Ember" value={editing.jmlEmber} onChange={handleEmberChange} />
                {isSuperAdmin ? (
                  <InputField label="Faktor Pakan" value={editing.faktorPakan} onChange={handleFaktorPakanChange} />
                ) : (
                  <InputField label="Faktor Pakan" value={editing.faktorPakan} onChange={() => {}} readOnly />
                )}
                <InputField label="Jml Pakan (calc)" value={editing.jmlPakan} onChange={() => {}} readOnly blue />
                <InputField label="H. Pakan" value={editing.hargaPakan} onChange={(v: string) => setEditing({...editing, hargaPakan: parseFloat(v) || 0})} blue />
              </div>
              
              {/* Calculated Fields - Display Only */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-blue-50 rounded-xl">
                <p className="col-span-2 text-[10px] uppercase font-black text-blue-400 tracking-wider border-b border-blue-100 pb-1">Calculated Values</p>
                <InputField label="G/Ekor" value={editing.gramEkor} onChange={() => {}} readOnly blue />
                <InputField label="B Pakan" value={editing.beratPakan} onChange={() => {}} readOnly blue />
                <InputField label="Vol/Ember" value={editing.volEmber} onChange={() => {}} readOnly blue />
              </div>
              
              <button 
                onClick={handleSaveMaster}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-blue-600 transition-all"
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

function InputField({ label, value, onChange, readOnly, dark, blue }: any) {
  // Format number with comma thousand separators for display
  const displayValue = useMemo(() => {
    if (value == null || value === "") return "";
    const strVal = String(value).replace(/,/g, "");
    const num = parseFloat(strVal);
    if (isNaN(num)) return value;
    return num.toLocaleString("en-US");
  }, [value]);

  return (
    <div className={cn("space-y-1.5 flex-1", blue && "bg-blue-50 rounded-xl px-4 py-2")}>
      <label className={cn("text-[9px] uppercase font-black tracking-[0.2em] px-1", dark ? "text-blue-200/50" : blue ? "text-blue-400" : "text-slate-400")}>
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(e) => {
          // Only allow digits and decimal point
          const cleaned = e.target.value.replace(/[^\d.]/g, "");
          onChange(cleaned);
        }}
        readOnly={readOnly}
        className={cn(
          "w-full px-4 py-3 rounded-xl text-base font-black outline-none transition-all",
          dark
            ? "bg-white/10 border-white/5 text-white placeholder-white/20 focus:bg-white/20"
            : blue
              ? "bg-blue-50 border-blue-200 text-blue-600 placeholder-blue-200"
              : "bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200"
        )}
        placeholder="0"
      />
    </div>
  );
}
