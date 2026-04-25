"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2 
} from "lucide-react";
import { InputField } from "@/components/InputField";
import { formatNumber } from "@/lib/format";

type CashFlowFormProps = {
  data: any;
  setData: (data: any) => void;
  isEditable: boolean;
  otherExpenses: any[];
  setOtherExpenses: (expenses: any[]) => void;
  newExpense: any;
  setNewExpense: (expense: any) => void;
  editingExpense: any;
  setEditingExpense: (expense: any) => void;
  selectedDate: string;
};

export function CashFlowForm({
  data,
  setData,
  isEditable,
  otherExpenses,
  setOtherExpenses,
  newExpense,
  setNewExpense,
  editingExpense,
  setEditingExpense,
  selectedDate,
}: CashFlowFormProps) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const res = await fetch("/api/workers", { credentials: "include" });
        if (res.ok) {
          const workerList = await res.json();
          setWorkers(workerList);
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

  const handleSaveExpense = async () => {
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
        body: JSON.stringify({ ...expense, date: selectedDate }),
      });
      if (res.ok) {
        setExpenseSuccess(true);
        setNewExpense({ amount: 0, description: "" });
        setEditingExpense(null);
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
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Hapus pengeluaran ini?")) return;
    try {
      const res = await fetch(`/api/expense?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const ts = Date.now();
        const expRes = await fetch(`/api/expense?date=${selectedDate}&_t=${ts}`);
        const expData = await expRes.json();
        setOtherExpenses(Array.isArray(expData) ? expData : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Expenses */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-500" />
          Pengeluaran Utama
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <InputField label="Biaya Pakan" value={data.biayaPakan} onChange={(v) => updateField(`biayaPakan`, v)} readOnly={!isEditable} />
          <InputField label="Operasional" value={data.biayaOperasional} onChange={(v) => updateField(`biayaOperasional`, v)} readOnly={!isEditable} />
          <InputField label="UP" value={data.up} onChange={(v) => updateField(`up`, v)} readOnly={!isEditable} />
        </div>
      </div>

      {/* Salaries */}
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
                onChange={(v) => updateSalary(worker.id, v)} 
                readOnly={!isEditable} 
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-300 text-sm">No workers configured</p>
        )}
      </div>

      {/* Balances & Dividends */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-6">Balances & Dividends</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <InputField label="Deviden A" value={data.devidenA} onChange={(v) => updateField(`devidenA`, v)} readOnly={!isEditable} />
          <InputField label="Deviden B" value={data.devidenB} onChange={(v) => updateField(`devidenB`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Rekening" value={data.saldoKas} onChange={(v) => updateField(`saldoKas`, v)} readOnly={!isEditable} />
          <InputField label="Saldo Cash" value={data.saldoCash} onChange={(v) => updateField(`saldoCash`, v)} readOnly={!isEditable} />
        </div>
      </div>

      {/* Other Expenses */}
      <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-100">
        <h3 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          Pengeluaran Lain
        </h3>
        
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
                onClick={handleSaveExpense}
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
                          onClick={() => handleDeleteExpense(expense.id)}
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