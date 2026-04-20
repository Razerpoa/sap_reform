"use client";

import { useState, useEffect } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2,
  Plus,
  Users,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Worker = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newWorkerName, setNewWorkerName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workers");
      if (!res.ok) throw new Error("Failed to fetch workers");
      const data = await res.json();
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkerName.trim()) {
      setError("Worker name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkerName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create worker");
      }

      const newWorker = await res.json();
      setWorkers([...workers, newWorker].sort((a, b) => a.name.localeCompare(b.name)));
      setNewWorkerName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add worker");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateWorker() {
    if (!editingId || !editingName.trim()) {
      setError("Name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editingName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update worker");
      }

      const updated = await res.json();
      setWorkers(
        workers.map((w) => (w.id === editingId ? updated : w)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditingName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update worker");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(worker: Worker) {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: worker.id, 
          name: worker.name, 
          active: !worker.active 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      const updated = await res.json();
      setWorkers(workers.map((w) => (w.id === worker.id ? updated : w)));
      // setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteWorker() {
    if (!deletingId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workers?id=${deletingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete worker");
      }

      setWorkers(workers.filter((w) => w.id !== deletingId));
      setDeletingId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete worker");
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Pekerja</h1>
        <p className="text-slate-500 text-sm">Kelola daftar pekerja dan informasi gaji mereka</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Operasi berhasil
        </div>
      )}

      {/* Add Worker Form */}
      <form onSubmit={handleAddWorker} className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Tambah Pekerja Baru
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newWorkerName}
            onChange={(e) => setNewWorkerName(e.target.value)}
            placeholder="Nama pekerja..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newWorkerName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      </form>

      {/* Workers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-600">Nama</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-600">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-600">Dibuat</th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker, idx) => (
                <tr key={worker.id} className={cn("hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-200")}>
                  {/* Nama */}
                  <td className="px-6 py-4">
                    {editingId === worker.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="font-bold text-slate-900">{worker.name}</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(worker)}
                      disabled={submitting}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                        worker.active 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      {worker.active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>

                  {/* Dibuat */}
                  <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(worker.createdAt)}
                    </div>
                  </td>

                  {/* Aksi */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === worker.id ? (
                        <>
                          <button onClick={handleUpdateWorker} disabled={submitting} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                            Batal
                          </button>
                        </>
                      ) : deletingId === worker.id ? (
                        <>
                          <span className="text-xs font-bold text-red-600 mr-1">Hapus?</span>
                          <button onClick={handleDeleteWorker} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">Ya</button>
                          <button onClick={() => setDeletingId(null)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">Tidak</button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setEditingId(worker.id); setEditingName(worker.name); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingId(worker.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}