"use client";

import { useState, useMemo, useEffect } from "react";
import { ShoppingBag, CheckCircle2, X } from "lucide-react";
import { formatNumber } from "@/lib/format";

type StockData = {
  id?: number;
  date?: string;
  kandang: string;
  productionKg?: number;
  soldKg?: number;
  stockKg?: number;
  stockPeti?: number;
};

type CageData = {
  kandang: string;
};

type SelectedCage = {
  kandang: string;
  jmlPeti: number;
  jmlKg: number;
};

type SalesData = {
  customerName: string;
  hargaJual: number;
  jmlPeti: number;
  totalKg: number;
  sourceCages: SelectedCage[];
};

type SalesSectionProps = {
  data: any[];
  newSale: any;
  setNewSale: (sale: any) => void;
  isEditable: boolean;
  onSave: (saleData: SalesData) => void;
  stockData?: StockData[];
  cages?: CageData[];
};

export function SalesSection({ data, newSale, setNewSale, isEditable, onSave, stockData = [], cages = [] }: SalesSectionProps) {
  // New state for multi-cage selection
  const [selectedCages, setSelectedCages] = useState<SelectedCage[]>([]);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerSelectedCage, setPickerSelectedCage] = useState<string | null>(null);
  const [pickerPeti, setPickerPeti] = useState(0);
  const [pickerKg, setPickerKg] = useState(0);

  // Calculate stock for each cage (cumulative - all time production - all time sold)
  const cageStocks = useMemo(() => {
    return cages.map((cage) => {
      const stock = stockData.find((s) => s.kandang === cage.kandang);
      const stockKg = stock?.stockKg || 0;
      const peti = Math.floor(stockKg / 15);
      const sisaKg = Math.round((stockKg % 15) * 100) / 100; // Round to 2 decimals
      return {
        kandang: cage.kandang,
        stockKg,
        peti,
        sisaKg,
      };
    });
  }, [cages, stockData]);

  // Calculate remaining stock after in-session selections
  const remainingStocks = useMemo(() => {
    return cageStocks.map((cage) => {
      const selected = selectedCages.filter((s) => s.kandang === cage.kandang);
      const usedPeti = selected.reduce((sum, s) => sum + s.jmlPeti, 0);
      const remainingPeti = cage.peti - usedPeti;
      return {
        ...cage,
        remainingPeti: remainingPeti < 0 ? 0 : remainingPeti,
        usedPeti,
      };
    });
  }, [cageStocks, selectedCages]);

  // Check if any stock available
  const hasAnyStock = remainingStocks.some((s) => s.remainingPeti > 0);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPickerModal) {
        setShowPickerModal(false);
        setPickerSelectedCage(null);
        setPickerPeti(0);
        setPickerKg(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPickerModal]);

  // Calculate global summary
  const globalSummary = useMemo(() => {
    const totalPeti = cageStocks.reduce((sum, c) => sum + c.peti, 0);
    const totalSisaKg = Math.round(cageStocks.reduce((sum, c) => sum + c.sisaKg, 0) * 100) / 100;
    return { totalPeti, totalSisaKg };
  }, [cageStocks]);

  // Calculate totals from selectedCages
  const totalPeti = selectedCages.reduce((sum, c) => sum + c.jmlPeti, 0);
  const totalKg = selectedCages.reduce((sum, c) => sum + c.jmlPeti * 15 + c.jmlKg, 0);

  // Validation function
  const validateStock = () => {
    for (const cage of selectedCages) {
      const available = cageStocks.find(s => s.kandang === cage.kandang)?.peti || 0;
      if (cage.jmlPeti > available) {
        return { 
          valid: false, 
          error: `Stok ${cage.kandang} tidak cukup! Available: ${available} peti, requested: ${cage.jmlPeti} peti` 
        };
      }
    }
    return { valid: true };
  };

  // Handle remove cage from selection
  const removeCage = (kandang: string) => {
    setSelectedCages(selectedCages.filter(c => c.kandang !== kandang));
  };

  // Handle add cage from modal
  const handleAddCage = () => {
    if (!pickerSelectedCage) return;
    if (pickerPeti === 0 && pickerKg === 0) return;

    // Prevent duplicate cage selection
    if (selectedCages.some((c) => c.kandang === pickerSelectedCage)) {
      alert("Kandang ini sudah dipilih! Hapus dulu dari daftar jika ingin mengubah.");
      return;
    }

    // Check if exceeds remaining stock
    const remaining = remainingStocks.find((s) => s.kandang === pickerSelectedCage);
    if (pickerPeti > (remaining?.remainingPeti || 0)) {
      alert(`Stok tidak cukup! Tersedia: ${remaining?.remainingPeti || 0} peti`);
      return;
    }

    setSelectedCages([
      ...selectedCages,
      {
        kandang: pickerSelectedCage,
        jmlPeti: pickerPeti,
        jmlKg: pickerKg,
      },
    ]);
    setShowPickerModal(false);
    setPickerSelectedCage(null);
    setPickerPeti(0);
    setPickerKg(0);
  };

  // Handle save with validation
  const handleSave = () => {
    // Validate stock before save
    const validation = validateStock();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Pass selected cage data directly to onSave callback (avoid async state issue)
    const saleData = {
      customerName: newSale.customerName || "",
      hargaJual: newSale.hargaJual || 0,
      jmlPeti: totalPeti,
      totalKg: totalKg,
      sourceCages: selectedCages,
    };

    // Call onSave with the actual data
    onSave(saleData);

    // Reset after save
    setSelectedCages([]);
    setNewSale({
      ...newSale,
      customerName: "",
      hargaJual: 0,
      jmlPeti: 0,
      totalKg: 0,
      sourceCages: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Card - Stok */}
      <div className="bg-slate-900 md:p-8 p-5 rounded-[2rem] text-white">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="md:text-xl text-base font-black text-slate-400 uppercase tracking-tight">Status Stok</h3>
        </div>

        {/* Global Summary */}
        <div className="bg-slate-800/50 md:p-5 p-4 rounded-2xl mb-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ketersediaan</span>
            <div className="md:text-3xl text-2xl font-black mt-1 italic">
              {globalSummary.totalPeti} <span className="text-sm font-black text-slate-500 uppercase not-italic">Peti</span> <span className="text-slate-700 mx-1">|</span> {globalSummary.totalSisaKg} <span className="text-sm font-black text-slate-500 uppercase not-italic">Kg</span>
            </div>
        </div>

        {/* Per-cage stock display */}
        <div className="grid grid-cols-1 gap-2">
          {cageStocks.map((cage) => (
            <div key={cage.kandang} className="flex items-center justify-between bg-slate-800/30 md:p-4 p-3 rounded-xl border border-slate-700/30">
              <span className="font-black text-slate-300 uppercase text-xs">{cage.kandang}</span>
              <div className="text-right">
                <span className="font-black text-white text-sm">
                  {cage.peti} <span className="text-[10px] text-slate-500">Peti</span> <span className="text-slate-700 mx-1">|</span> {cage.sisaKg} <span className="text-[10px] text-slate-500">Kg</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEditable && (
        <div className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Entri Penjualan</h3>

          {/* 3. Input Fields */}
          <div className="bg-slate-50 rounded-[1.5rem] p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-400 font-black tracking-widest px-1">
                  Nama Customer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toko Berkah"
                  value={newSale.customerName}
                  onChange={(e) => setNewSale({ ...newSale, customerName: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:font-medium placeholder:text-slate-300"
                />
              </div>

              {/* Harga Jual */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-400 font-black tracking-widest px-1">
                  Harga Jual (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newSale.hargaJual.toLocaleString() || ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "");
                    const num = parseInt(raw) || 0;
                    setNewSale({ ...newSale, hargaJual: num });
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:font-medium placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* 4. Add Sale Record Button */}
          <button
            onClick={handleSave}
            disabled={selectedCages.length === 0 || !newSale.customerName || newSale.hargaJual === 0}
            className="w-full bg-blue-600 text-white font-black mb-4 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            Add Sale Record
          </button>

          {/* 1. "Pilih Kandang" Button - show availability status */}
          {!hasAnyStock ? (
            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center mb-4">
              <span className="inline-flex items-center gap-2 text-slate-400 font-bold">
                <span className="text-2xl">✕</span>
                <span>Tidak ada stok tersedia</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowPickerModal(true)}
              className="w-full bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
            >
              <span className="inline-flex items-center gap-2 text-slate-600 font-bold">
                <span className="text-2xl">+</span>
                <span>Pilih Kandang</span>
              </span>
            </button>
          )}

          {/* 2. Selected Cages Stacked Cards */}
          {selectedCages.length > 0 && (
            <div className="space-y-3 mb-4">
              {selectedCages.map((cage) => {
                const remaining = remainingStocks.find(s => s.kandang === cage.kandang);
                return (
                  <div key={cage.kandang} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-black text-slate-900">Kandang {cage.kandang}</span>
                        <span className="text-xs text-blue-600 ml-2">
                          {remaining?.remainingPeti || 0} peti tersedia
                        </span>
                      </div>
                      <button 
                        onClick={() => removeCage(cage.kandang)} 
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Ambil: <strong>{cage.jmlPeti}</strong> peti</span>
                      <span><strong>{cage.jmlKg}</strong> kg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Total Summary */}
          {selectedCages.length > 0 && (
            <div className="bg-blue-100 rounded-xl p-4 text-center mb-4">
              <span className="text-sm font-bold text-blue-800">
                Total: {formatNumber(totalPeti)} peti | {formatNumber(totalKg)} kg
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pilih Kandang Modal */}
      {showPickerModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPickerModal(false);
              setPickerSelectedCage(null);
              setPickerPeti(0);
              setPickerKg(0);
            }
          }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Pilih Kandang</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Alokasi Stok Penjualan</p>
              </div>
              <button 
                onClick={() => {
                  setShowPickerModal(false);
                  setPickerSelectedCage(null);
                  setPickerPeti(0);
                  setPickerKg(0);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cage Grid */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {cages.map((cage) => {
                  const remaining = remainingStocks.find(s => s.kandang === cage.kandang);
                  const isSelected = pickerSelectedCage === cage.kandang;
                  const isDisabled = (remaining?.remainingPeti || 0) === 0;
                  return (
                    <button
                      key={cage.kandang}
                      onClick={() => {
                        if (isDisabled) return;
                        setPickerSelectedCage(cage.kandang);
                        setPickerPeti(0);
                        setPickerKg(0);
                      }}
                      disabled={isDisabled}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10" 
                          : isDisabled
                            ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                            : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-black text-slate-900 text-lg block mb-1">{cage.kandang}</span>
                      <div className={`text-[10px] font-black uppercase tracking-tighter ${isDisabled ? 'text-slate-400' : 'text-blue-600'}`}>
                        {remaining?.remainingPeti || 0} <span className="opacity-50 font-medium">Peti</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Qty Input (only if cage selected) */}
              {pickerSelectedCage && (
                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 animate-in slide-in-from-top-2">
                  {(() => {
                    const remaining = remainingStocks.find(s => s.kandang === pickerSelectedCage);
                    const exceedsStock = pickerPeti > (remaining?.remainingPeti || 0);
                    return (
                      <>
                        <div className="flex items-center gap-2 mb-4 justify-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Pengambilan</span>
                           <div className="h-px flex-1 bg-slate-200"></div>
                        </div>
                        {exceedsStock && (
                          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-xl text-center flex items-center justify-center gap-2">
                            <span className="text-[10px] font-black text-red-600 uppercase">
                              ⚠️ Melebihi stok! (Max: {remaining?.remainingPeti || 0})
                            </span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 text-center">Peti</label>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={pickerPeti.toLocaleString()} 
                              onChange={e => setPickerPeti(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-black text-xl text-center outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 text-center">Sisa Kg</label>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              value={pickerKg.toLocaleString()} 
                              onChange={e => {
                                const v = parseInt(e.target.value) || 0;
                                setPickerKg(v >= 15 ? v % 15 : v);
                              }}
                              className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-black text-xl text-center outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" 
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Pilih Button */}
              <button 
                onClick={handleAddCage}
                disabled={!pickerSelectedCage || (pickerPeti === 0 && pickerKg === 0)}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl disabled:bg-slate-300 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20 uppercase tracking-widest text-sm"
              >
                Alokasikan Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {data.length > 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base">Log Penjualan Hari Ini</h3>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
              {data.length} Records
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data.map((sale: any) => (
              <div key={sale.id} className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors active:bg-slate-50">
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base truncate">{sale.customerName}</h4>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-md">{formatNumber(sale.jmlPeti)} Peti</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-md">{formatNumber(sale.totalKg % 15)} KG</span>
                  </div>
                  {sale.sourceCages && sale.sourceCages.length > 0 && (
                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-2 opacity-70">
                      Via: {sale.sourceCages.map((c: any) => c.kandang).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base sm:text-lg font-black text-slate-900 italic">Rp {formatNumber(sale.subTotal)}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">@{formatNumber(sale.hargaJual)}</p>
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