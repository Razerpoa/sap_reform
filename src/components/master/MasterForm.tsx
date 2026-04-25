"use client";

import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Settings2, Trash2, X, CheckCircle2, Loader2 } from "lucide-react";
import { InputField } from "@/components/InputField";

type MasterFormProps = {
  data: any[];
  onSave: () => void;
};

export function MasterForm({ data, onSave }: MasterFormProps) {
  const [editing, setEditing] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCage, setNewCage] = useState({ kandang: "", jmlAyam: 0, jmlEmber: 0, jmlPakan: 0, hargaPakan: 7300 });
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useUserRole();

  const handleEdit = (item: any) => {
    setEditing({ ...item });
  };

  const handleSaveMaster = async () => {
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
    }
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
            <InputField label="Kandang" value={newCage.kandang} onChange={(v) => setNewCage({...newCage, kandang: v.toUpperCase()})} placeholder="B4" />
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
            <button onClick={handleAddNew} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-500">Add Cage</button>
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
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Jml Pakan</p>
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
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <p className="col-span-2 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-100 pb-1">Input Data</p>
                <InputField label="Jml Ayam" value={editing.jmlAyam} onChange={(v) => setEditing({...editing, jmlAyam: parseInt(v) || 0})} />
                <InputField label="Mortalities" value={editing.mortality} onChange={(v) => setEditing({...editing, mortality: parseInt(v) || 0})} />
                <InputField label="Jml Ember" value={editing.jmlEmber} onChange={handleEmberChange} />
                {isAdmin ? (
                  <InputField label="Faktor Pakan" value={editing.faktorPakan} onChange={handleFaktorPakanChange} />
                ) : (
                  <InputField label="Faktor Pakan" value={editing.faktorPakan} onChange={() => {}} readOnly />
                )}
                <InputField label="Jml Pakan (calc)" value={editing.jmlPakan} onChange={() => {}} readOnly blue />
                <InputField label="H. Pakan" value={editing.hargaPakan} onChange={(v) => setEditing({...editing, hargaPakan: parseFloat(v) || 0})} blue />
              </div>
              
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