"use client";

import { useState, useMemo, useEffect } from "react";
import { ShoppingBag, CheckCircle2, X } from "lucide-react";
import { formatNumber } from "@/lib/format";

type StockData = {
  id?: number;
  date?: string;
  kandang: string;
  openingKg?: number;
  productionKg?: number;
  soldKg?: number;
  closingKg?: number;
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

  // Calculate stock for each cage (original)
  const cageStocks = useMemo(() => {
    return cages.map((cage) => {
      const stock = stockData.find((s) => s.kandang === cage.kandang);
      const totalKg = stock?.closingKg || 0;
      const peti = Math.floor(totalKg / 15);
      const sisaKg = Math.round((totalKg % 15) * 100) / 100; // Round to 2 decimals
      return {
        kandang: cage.kandang,
        totalKg,
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
      <div className="bg-slate-900 md:p-8 p-5 rounded-2xl text-white">
        <div className="flex items-center justify-between mb-5 md:mb-6">
          <h3 className="md:text-xl text-base font-black text-slate-400 uppercase tracking-wider">Stok</h3>
        </div>

        {/* Global Summary */}
        <div className="bg-slate-800/50 md:p-4 p-3 rounded-xl mb-4">
          <div className="text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stok</span>
            <div className="md:text-2xl text-xl font-black mt-1">
              {globalSummary.totalPeti} peti <span className="text-slate-500">|</span> {globalSummary.totalSisaKg} kg
            </div>
          </div>
        </div>

        {/* Per-cage stock display */}
        <div className="space-y-2">
          {cageStocks.map((cage) => (
            <div key={cage.kandang} className="flex items-center justify-between bg-slate-800/30 md:p-3 p-2.5 rounded-lg">
              <span className="font-bold text-slate-300 uppercase">{cage.kandang}</span>
              <div className="text-right">
                <span className="font-black text-white">
                  {cage.peti} peti <span className="text-slate-500">|</span> {cage.sisaKg} kg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEditable && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6">Entri Penjualan Baru</h3>

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

{/* 4. Input Fields - Single Row */}
          <div className="bg-slate-50 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-wide">
                  Customer
                </label>
                <input
                  type="text"
                  placeholder="Nama customer"
                  value={newSale.customerName}
                  onChange={(e) => setNewSale({ ...newSale, customerName: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Harga Jual */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-wide">
                  Harga Jual
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
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

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

          {/* 5. Add Sale Record Button */}
          <button
            onClick={handleSave}
            disabled={selectedCages.length === 0 || !newSale.customerName || newSale.hargaJual === 0}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            Add Sale Record
          </button>
        </div>
      )}

      {/* Pilih Kandang Modal */}
      {showPickerModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPickerModal(false);
              setPickerSelectedCage(null);
              setPickerPeti(0);
              setPickerKg(0);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg">Pilih Kandang</h3>
              <button 
                onClick={() => {
                  setShowPickerModal(false);
                  setPickerSelectedCage(null);
                  setPickerPeti(0);
                  setPickerKg(0);
                }}
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Cage Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
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
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected 
                        ? "border-blue-500 bg-blue-50" 
                        : isDisabled
                          ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                          : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="font-black">{cage.kandang}</span>
                    <span className={`text-xs block ${isDisabled ? 'text-slate-400' : 'text-blue-600'}`}>
                      {remaining?.remainingPeti || 0} peti
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Qty Input (only if cage selected) */}
            {pickerSelectedCage && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                {(() => {
                  const remaining = remainingStocks.find(s => s.kandang === pickerSelectedCage);
                  const exceedsStock = pickerPeti > (remaining?.remainingPeti || 0);
                  return (
                    <>
                      {exceedsStock && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                          <span className="text-xs font-bold text-red-600">
                            ⚠️ Melebihi stok! Maks: {remaining?.remainingPeti || 0} peti
                          </span>
                        </div>
                      )}
                      <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Ambil (Peti)</label>
                    <input 
                      type="number" 
                      value={pickerPeti.toLocaleString()} 
                      onChange={e => setPickerPeti(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-center outline-none focus:border-blue-400" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Sisa (Kg)</label>
                    <input 
                      type="number" 
                      value={pickerKg.toLocaleString()} 
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        setPickerKg(v >= 15 ? v % 15 : v);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-center outline-none focus:border-blue-400" 
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
              className="w-full bg-blue-600 text-white font-black py-3 rounded-xl disabled:bg-slate-300 hover:bg-blue-700 transition-colors"
            >
              Pilih
            </button>
          </div>
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
                  <p className="text-xs text-slate-400 font-bold">{formatNumber(sale.jmlPeti)} Peti • {formatNumber(sale.totalKg)} KG</p>
                  {sale.sourceCages && sale.sourceCages.length > 0 && (
                    <p className="text-[10px] text-blue-500 font-bold mt-1">
                      Dari: {sale.sourceCages.map((c: any) => `${c.kandang} (${c.jmlPeti} peti${c.jmlKg > 0 ? ` + ${Number(c.jmlKg).toFixed(2)}kg` : ''})`).join(', ')}
                    </p>
                  )}
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