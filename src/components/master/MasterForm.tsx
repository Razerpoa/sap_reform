"use client";

import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Settings2, Trash2, X, CheckCircle2, Loader2, XCircle, ShieldCheck } from "lucide-react";
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
      {/* Global Harga Sentral Card */}
      <div className="bg-slate-900 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-400 font-black uppercase tracking-wider text-sm">Harga Sentral</h3>
          {hargaSentralSuccess && (
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">Tersimpan</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={hargaSentralValue}
              onChange={(e) => setHargaSentralValue(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin || hargaSentralSaving}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-xl font-black outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
          </div>
          {isAdmin && (
            <button
              onClick={handleSaveHargaSentral}
              disabled={hargaSentralSaving}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-500 transition-colors disabled:bg-blue-400 flex items-center gap-2"
            >
              {hargaSentralSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-black hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Cage Group
        </button>
      )}

      {isAddingNew && (
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-slate-900">New Cage Group</h4>
            <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="relative">
              <InputField label="Kandang" value={newCage.kandang} onChange={(v) => setNewCage({...newCage, kandang: sanitizeKandang(v)})} />
              {isDuplicateKandang && (
                <p className="text-[10px] text-red-500 mt-1 font-bold">Already exists</p>
              )}
            </div>
            <InputField label="Jml Ayam" value={newCage.jmlAyam} onChange={(v) => setNewCage({...newCage, jmlAyam: parseInt(v) || 0})} />
            <InputField label="Jml Ember" value={newCage.jmlEmber} onChange={(v) => setNewCage({...newCage, jmlEmber: parseFloat(v) || 0})} />
            <InputField label="H. Pakan" value={newCage.hargaPakan} onChange={(v) => setNewCage({...newCage, hargaPakan: parseFloat(v) || 0})} />
          </div>
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
            <button 
              onClick={handleAddNew} 
              disabled={isDuplicateKandang || !newCage.kandang.trim()}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Add Cage
            </button>
          </div>
        </div>
      )}

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
                {isAdmin && (
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
                <p className="text-lg font-black text-slate-900">{item.jmlPakan?.toLocaleString() || 0}</p>
              </div>
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
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-blue-400 tracking-wider">H. Sentral</p>
                <p className="text-base font-black text-blue-600">{item.hargaSentral?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-sm sm:max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-8 sm:w-12 sm:h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm sm:text-lg">
                  {editing.kandang}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">Edit Kandang</h3>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Update cage data</p>
                </div>
              </div>
              <button 
                onClick={() => setEditing(null)} 
                disabled={saving}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
              {/* Input Data Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-black text-blue-600">1</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-700 uppercase tracking-wide">Input Data</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider">Jml Ayam</label>
                    <input
                      type="number"
                      value={editing.jmlAyam}
                      onChange={(e) => setEditing({...editing, jmlAyam: parseInt(e.target.value) || 0})}
                      disabled={saving}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider">Mortalities</label>
                    <input
                      type="number"
                      value={editing.mortality}
                      onChange={(e) => setEditing({...editing, mortality: parseInt(e.target.value) || 0})}
                      disabled={saving}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider">Jml Ember</label>
                    <input
                      type="number"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider">Faktor Pakan</label>
                    <input
                      type="number"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-blue-400 tracking-wider">Jml Pakan (calc)</label>
                    <div className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-blue-50 text-sm sm:text-base font-black text-blue-600">
                      {editing.jmlPakan?.toLocaleString() || 0}
                    </div>
                  </div>
<div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs uppercase font-black text-slate-400 tracking-wider">H. Pakan</label>
                    <input
                      type="number"
                      value={editing.hargaPakan}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditing({
                          ...editing,
                          hargaPakan: val,
                          beratPakan: (parseFloat(String(editing.jmlPakan)) || 0) * val,
                        });
                      }}
                      disabled={saving}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Values Section */}
              <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-200 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-black text-blue-700">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-blue-700 uppercase tracking-wide">Calculated Values</h4>
                    <p className="text-[10px] sm:text-xs text-blue-400 hidden sm:block">Auto-calculated from inputs</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-white/70 rounded-xl p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs uppercase font-black text-blue-400 tracking-wider mb-1 sm:mb-2">G/Ekor</p>
                    <p className="text-sm sm:text-xl font-black text-blue-600">{editing.gramEkor?.toFixed(3) || "0.000"}</p>
                    <p className="text-[10px] sm:text-xs text-blue-300 mt-1 sm:mt-2">Pakan ÷ Ayam</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs uppercase font-black text-blue-400 tracking-wider mb-1 sm:mb-2">B Pakan</p>
                    <p className="text-sm sm:text-xl font-black text-blue-600">{editing.beratPakan?.toLocaleString() || 0}</p>
                    <p className="text-[10px] sm:text-xs text-blue-300 mt-1 sm:mt-2">Pakan × Harga</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs uppercase font-black text-blue-400 tracking-wider mb-1 sm:mb-2">Vol/Ember</p>
                    <p className="text-sm sm:text-xl font-black text-blue-600">{editing.volEmber?.toFixed(1) || "0.0"}</p>
                    <p className="text-[10px] sm:text-xs text-blue-300 mt-1 sm:mt-2">Pakan ÷ Ember</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs uppercase font-black text-blue-400 tracking-wider mb-1 sm:mb-2">H. Sentral</p>
                    <p className="text-sm sm:text-xl font-black text-blue-600">{editing.hargaSentral?.toLocaleString() || 0}</p>
                    <p className="text-[10px] sm:text-xs text-blue-300 mt-1 sm:mt-2">Global</p>
                  </div>
                </div>
</div>

              {/* Error Display */}
              {saveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{saveError}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="flex-1 py-2 sm:py-3 border border-slate-300 rounded-xl font-black text-slate-600 text-xs sm:text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMaster}
                  disabled={saving}
                  className="flex-1 py-2 sm:py-3 bg-blue-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-blue-500 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-1 sm:gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      <span className="hidden sm:inline">Menyimpan...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-slate-200 mt-8">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-tight">Pemeliharaan Sistem</h4>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Verifikasi integritas & sinkronisasi data</p>
            </div>
          </div>
          <Link 
            href="/health"
            className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            Buka Panel Kesehatan
          </Link>
        </div>
      </div>
    </div>
  );
}