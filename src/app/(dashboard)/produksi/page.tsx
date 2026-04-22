"use client";

import { useEffect, useState } from "react";

export default function Produksi() {
  const [masterData, setMasterData] = useState<any[]>([]);

  async function fetchData() {
    const ts = Date.now();
    try {
      const res = await fetch(`/api/master?_t=${ts}`);
      const data = await res.json();
      setMasterData(Array.isArray(data) ? data : []);
    } catch {
      setMasterData([]); // Show empty form on error
    }
  }

  useEffect(() => {
    fetchData();
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {masterData.map((item: any) => (
        <div key={item.kandang} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg group-hover:bg-blue-600 transition-colors">
                {item.kandang}
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-lg">Kandang {item.kandang}</h4>
                {/* <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Master Data</p> */}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Jumlah Ayam</p>
              <p className="text-2xl font-black text-slate-900">{item.jmlAyam.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Gram/Ekor</p>
              <p className="text-2xl font-black text-slate-900">{item.gramEkor.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Jml Ember</p>
              <p className="text-2xl font-black text-slate-900">{item.jmlEmber.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Jml Pakan</p>
              <p className="text-2xl font-black text-slate-900">{item.jmlPakan.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}