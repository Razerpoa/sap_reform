"use client";

import { ShoppingBag, CheckCircle2 } from "lucide-react";
import { InputField } from "@/components/InputField";
import { formatNumber } from "@/lib/format";

type SalesSectionProps = {
  data: any[];
  newSale: any;
  setNewSale: (sale: any) => void;
  isEditable: boolean;
  onSave: () => void;
  hargaSentral?: number;
  setHargaSentral?: (value: number) => void;
};

export function SalesSection({ data, newSale, setNewSale, isEditable, onSave, hargaSentral, setHargaSentral }: SalesSectionProps) {
  return (
    <div className="space-y-6">
{/* Global Card - Harga Sentral */}
      <div className="bg-slate-900 md:p-8 p-5 rounded-2xl text-white">
        <h3 className="md:text-xl text-base font-black mb-5 md:mb-6 text-slate-400 uppercase tracking-wider">Harga Sentral</h3>
        <div className="grid grid-cols-1">
          <div className="bg-slate-800/50 md:p-6 p-4 rounded-xl text-center">
            <div className="md:text-4xl text-2xl font-black">
              {isEditable && setHargaSentral ? (
                <input
                  type="text"
                  value={hargaSentral ? hargaSentral.toLocaleString() : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, "");
                    setHargaSentral(parseFloat(val) || 0);
                  }}
                  className="w-full text-center bg-transparent border-b-2 border-slate-600 focus:border-white"
                  placeholder="0"
                />
              ) : (
                formatNumber(hargaSentral || 0)
              )}
            </div>
          </div>
        </div>
      </div>

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
            <InputField label="Peti" value={newSale.jmlPeti} onChange={(v) => setNewSale({...newSale, jmlPeti: parseFloat(v) || 0})} />
            <InputField label="Total Kg" value={newSale.totalKg} onChange={(v) => setNewSale({...newSale, totalKg: parseFloat(v) || 0})} />
            <InputField label="Harga Jual" value={newSale.hargaJual} onChange={(v) => setNewSale({...newSale, hargaJual: parseFloat(v) || 0})} />
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