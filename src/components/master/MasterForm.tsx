"use client";

import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Settings2, Trash2, X, CheckCircle2, Loader2, XCircle, ShieldCheck, Save } from "lucide-react";
import { InputField } from "@/components/InputField";
import Link from "next/link";

type MasterFormProps = {
  data: any[];
  onSave: () => void;
};

export function MasterForm({ data, onSave }: MasterFormProps) {
  const [editing, setEditing] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCage, setNewCage] = useState({ kandang: "", jmlAyam: 0, jmlEmber: 0, jmlPakan: 0, hargaPakan: 7300 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { isAdmin } = useUserRole();

  // Global hargaSentral state
  const [hargaSentralValue, setHargaSentralValue] = useState(0);
  const [hargaSentralSaving, setHargaSentralSaving] = useState(false);
  const [hargaSentralSuccess, setHargaSentralSuccess] = useState(false);

  // Initialize hargaSentral from first cage data
  useEffect(() => {
    if (data && data.length > 0 && data[0].hargaSentral !== undefined) {
      setHargaSentralValue(data[0].hargaSentral);
    }
  }, [data]);

  const handleSaveHargaSentral = async () => {
    if (hargaSentralSaving || !isAdmin) return;
    setHargaSentralSaving(true);
    try {
      const res = await fetch("/api/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hargaSentral: hargaSentralValue }),
      });
      if (res.ok) {
        setHargaSentralSuccess(true);
        setTimeout(() => setHargaSentralSuccess(false), 2000);
        onSave();
      }
    } catch (error) {
      console.error("Failed to save hargaSentral:", error);
    }
    setHargaSentralSaving(false);
  };

  // Only allow A, B, numbers, and + for Kandang input
  const sanitizeKandang = (value: string) => {
    return value.toUpperCase().replace(/[^AB0-9+]/g, "");
  };

  // Check if Kandang already exists
  const isDuplicateKandang = newCage.kandang.trim() && data.some(
    (item: any) => item.kandang.toUpperCase() === newCage.kandang.toUpperCase()
  );

  const handleEdit = (item: any) => {
    setEditing({ ...item });
  };

  const handleSaveMaster = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    
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
    const res = await fetch("/api/master", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calculatedData),
    });
    if (res.ok) {
      setEditing(null);
      onSave();
    } else {
      const data = await res.json();
      setSaveError(data.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleAddNew = async () => {
    if (!newCage.kandang.trim()) return;
    const jmlEmber = parseFloat(String(newCage.jmlEmber)) || 0;
    const faktorPakan = 13;
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

  return (
    <div className="space-y-3">
      {/* Global Harga Sentral Card */}
      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Harga Sentral Global</h3>
          {hargaSentralSuccess && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase">Berhasil</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">Rp</div>
            <input
              type="number"
              value={hargaSentralValue}
              onChange={(e) => setHargaSentralValue(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin || hargaSentralSaving}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800/50 text-white text-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/20 border border-slate-700 transition-all disabled:opacity-50"
              placeholder="0"
            />
          </div>
          {isAdmin && (
            <button
              onClick={handleSaveHargaSentral}
              disabled={hargaSentralSaving}
              className="h-[54px] px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:bg-slate-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {hargaSentralSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Update</span>
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 font-black hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Tambah Grup Kandang
        </button>
      )}

      {isAddingNew && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-500 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-slate-900 uppercase tracking-tight">Kandang Baru</h4>
            <button onClick={() => setIsAddingNew(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <InputField label="ID Kandang" value={newCage.kandang} onChange={(v) => setNewCage({...newCage, kandang: sanitizeKandang(v)})} />
              {isDuplicateKandang && (
                <p className="text-[10px] text-red-500 mt-1 font-black uppercase tracking-tight">Sudah ada</p>
              )}
            </div>
            <InputField label="Jml Ayam" value={newCage.jmlAyam} onChange={(v) => setNewCage({...newCage, jmlAyam: parseInt(v) || 0})} />
            <InputField label="Jml Ember" value={newCage.jmlEmber} onChange={(v) => setNewCage({...newCage, jmlEmber: parseFloat(v) || 0})} />
            <InputField label="Harga Pakan" value={newCage.hargaPakan} onChange={(v) => setNewCage({...newCage, hargaPakan: parseFloat(v) || 0})} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsAddingNew(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest">Batal</button>
            <button 
              onClick={handleAddNew} 
              disabled={isDuplicateKandang || !newCage.kandang.trim()}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-500/20 disabled:bg-slate-200 disabled:shadow-none transition-all"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((item: any) => (
          <div key={item.id || item.kandang} className="bg-white p-5 rounded-[2rem] border border-slate-200 hover:border-blue-400/50 shadow-sm transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm group-hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/10">
                  {item.kandang}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight">Kandang {item.kandang}</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.jmlAyam?.toLocaleString()} Ayam</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleEdit(item)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 rounded-lg transition-colors text-blue-600 active:scale-90"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(item.kandang)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors text-red-400 active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-50">
              <div className="space-y-0.5">
                <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter">Ember</p>
                <p className="text-sm font-black text-slate-900 italic">{item.jmlEmber?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter">Pakan</p>
                <p className="text-sm font-black text-slate-900 italic">{item.jmlPakan?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] uppercase font-black text-blue-400 tracking-tighter">G/Ekor</p>
                <p className="text-sm font-black text-blue-600 italic">{item.gramEkor?.toFixed(3) || "0.000"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-900/20">
                    {editing.kandang}
                 </div>
                 <div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Edit Kandang</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Master Data Grup</p>
                 </div>
              </div>
              <button 
                onClick={() => setEditing(null)} 
                disabled={saving}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Input Data Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">Jumlah Ayam</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editing.jmlAyam}
                    onChange={(e) => setEditing({...editing, jmlAyam: parseInt(e.target.value) || 0})}
                    disabled={saving}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">Mortalities</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editing.mortality}
                    onChange={(e) => setEditing({...editing, mortality: parseInt(e.target.value) || 0})}
                    disabled={saving}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">Jml Ember</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={editing.jmlEmber}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const faktorPakan = parseFloat(String(editing.faktorPakan)) || 13;
                      const jmlAyam = parseInt(String(editing.jmlAyam)) || 0;
                      setEditing({
                        ...editing,
                        jmlEmber: val,
                        jmlPakan: val * faktorPakan,
                        gramEkor: jmlAyam > 0 ? (val * faktorPakan) / jmlAyam : 0,
                        beratPakan: (val * faktorPakan) * (parseFloat(String(editing.hargaPakan)) || 0),
                        volEmber: val > 0 ? (val * faktorPakan) / val : 0,
                      });
                    }}
                    disabled={saving}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">Faktor Pakan</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={editing.faktorPakan}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 13;
                      const jmlEmber = parseFloat(String(editing.jmlEmber)) || 0;
                      const jmlAyam = parseInt(String(editing.jmlAyam)) || 0;
                      setEditing({
                        ...editing,
                        faktorPakan: val,
                        jmlPakan: jmlEmber * val,
                        gramEkor: jmlAyam > 0 ? (jmlEmber * val) / jmlAyam : 0,
                        beratPakan: (jmlEmber * val) * (parseFloat(String(editing.hargaPakan)) || 0),
                        volEmber: jmlEmber > 0 ? (jmlEmber * val) / jmlEmber : 0,
                      });
                    }}
                    disabled={!isAdmin || saving}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Calculated Values */}
              <div className="bg-blue-50 rounded-[1.5rem] p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-4 justify-center">
                   <div className="h-px flex-1 bg-blue-100"></div>
                   <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Preview</span>
                   <div className="h-px flex-1 bg-blue-100"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[9px] uppercase font-black text-blue-300 tracking-tighter mb-1">Gram/Ekor</p>
                    <p className="text-2xl font-black text-blue-700 italic">{editing.gramEkor?.toFixed(3) || "0.000"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] uppercase font-black text-blue-300 tracking-tighter mb-1">Vol/Ember</p>
                    <p className="text-2xl font-black text-blue-700 italic">{editing.volEmber?.toFixed(1) || "0.0"}</p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {saveError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-700 font-black uppercase tracking-tight">{saveError}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMaster}
                  disabled={saving}
                  className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {saving ? "Menyimpan" : "Simpan Perubahan"}
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6 sm:pt-8 border-t border-slate-100 mt-8">
        <div className="bg-slate-50 p-5 sm:p-6 rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 shrink-0">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">Pemeliharaan Sistem</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Integritas & Sinkronisasi</p>
            </div>
          </div>
          <Link 
            href="/health"
            className="w-full sm:w-auto px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            Buka Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
