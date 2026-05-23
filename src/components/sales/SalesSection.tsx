"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ShoppingBag, CheckCircle2, X, Pencil, Trash2, Plus, Minus, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/format";

type StockData = {
  id?: number;
  date?: string;
  kandang: string;
  productionKg?: number;
  soldKg?: number;
  stockKg?: number;
  stockPeti?: number;
  // Month-split FIFO stock fields (from getCageStockData)
  lastMonthStockKg?: number;
  lastMonthStockPeti?: number;
  lastMonthSisaKg?: number;
  currentMonthStockKg?: number;
  currentMonthStockPeti?: number;
  currentMonthSisaKg?: number;
};

type CageData = {
  kandang: string;
  hargaSentral?: number;
};

type SelectedCage = {
  kandang: string;
  jmlPeti: number;
  jmlKg: number;
};

type SalesData = {
  id?: string;
  customerName: string;
  hargaJual: number;
  jmlPeti: number;
  totalKg: number;
  sourceCages: SelectedCage[];
  pic?: string;
};

type SalesSectionProps = {
  data: any[];
  newSale: any;
  setNewSale: (sale: any) => void;
  isEditable: boolean;
  onSave: (saleData: SalesData) => void;
  onDelete: (id: string) => void;
  stockData?: StockData[];
  cages?: CageData[];
  salesWorkers?: any[];
};

export function SalesSection({ data, newSale, setNewSale, isEditable, onSave, onDelete, stockData = [], cages = [], salesWorkers = [] }: SalesSectionProps) {
  // New state for multi-cage selection
  const [selectedCages, setSelectedCages] = useState<SelectedCage[]>([]);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerSelectedCage, setPickerSelectedCage] = useState<string | null>(null);
  const [pickerPeti, setPickerPeti] = useState(0);
  const [pickerKg, setPickerKg] = useState(0);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingCageKey, setEditingCageKey] = useState<string | null>(null); // Track which cage is being edited in modal
  const modalRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate stock for each cage (cumulative + month-split FIFO)
  const cageStocks = useMemo(() => {
    return cages.map((cage) => {
      const stock = stockData.find((s) => s.kandang === cage.kandang);
      const stockKg = stock?.stockKg || 0;
      const peti = Math.floor(stockKg / 15);
      const sisaKg = Math.round((stockKg % 15) * 100) / 100; // Round to 2 decimals

      // Month-split fields (from backend FIFO computation)
      const lastStockKg = stock?.lastMonthStockKg ?? 0;
      const lastPeti = stock?.lastMonthStockPeti ?? Math.floor(lastStockKg / 15);
      const lastSisaKg = stock?.lastMonthSisaKg ?? Math.round((lastStockKg % 15) * 100) / 100;
      const currStockKg = stock?.currentMonthStockKg ?? 0;
      const currPeti = stock?.currentMonthStockPeti ?? Math.floor(currStockKg / 15);
      const currSisaKg = stock?.currentMonthSisaKg ?? Math.round((currStockKg % 15) * 100) / 100;

      return {
        kandang: cage.kandang,
        stockKg,
        peti,
        sisaKg,
        lastStockKg,
        lastPeti,
        lastSisaKg,
        currStockKg,
        currPeti,
        currSisaKg,
      };
    });
  }, [cages, stockData]);

  // Calculate remaining stock after in-session selections (with FIFO month tracking)
  const remainingStocks = useMemo(() => {
    return cageStocks.map((cage) => {
      const selected = selectedCages.filter((s) => s.kandang === cage.kandang);
      const usedPeti = selected.reduce((sum, s) => sum + s.jmlPeti, 0);
      const remainingPeti = cage.peti - usedPeti;

      // FIFO: consumed peti uses last month stock first, then current month
      const usedFromLast = Math.min(usedPeti, cage.lastPeti);
      const lastRemainingPeti = cage.lastPeti - usedFromLast;
      const currRemainingPeti = cage.currPeti - (usedPeti - usedFromLast);

      return {
        ...cage,
        remainingPeti: remainingPeti < 0 ? 0 : remainingPeti,
        lastMonthRemainingPeti: lastRemainingPeti < 0 ? 0 : lastRemainingPeti,
        currentMonthRemainingPeti: currRemainingPeti < 0 ? 0 : currRemainingPeti,
        usedPeti,
      };
    });
  }, [cageStocks, selectedCages]);

  // Current global hargaSentral (same for all cages)
  const hargaSentral = useMemo(() => {
    const cage = cages.find(c => c.hargaSentral && c.hargaSentral > 0);
    return cage?.hargaSentral || 0;
  }, [cages]);

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
        setEditingCageKey(null);
        setValidationError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPickerModal]);

  // Focus trap for modal
  useEffect(() => {
    if (showPickerModal && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTab);
      firstElement?.focus();

      return () => document.removeEventListener("keydown", handleTab);
    }
  }, [showPickerModal]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch customer name suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/sales/customers?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.names || []);
      setShowSuggestions(data.names?.length > 0);
      setSelectedSuggestionIndex(-1);
    } catch {
      // Silently fail
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Handle customer name change with debounce
  const handleCustomerNameChange = useCallback((value: string) => {
    setNewSale({ ...newSale, customerName: value });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }, [newSale, setNewSale, fetchSuggestions]);

  // Handle keyboard navigation in suggestion list
  const handleCustomerNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selected = suggestions[selectedSuggestionIndex];
          setNewSale({ ...newSale, customerName: selected });
          setShowSuggestions(false);
          setSuggestions([]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex, newSale, setNewSale]);

  // Handle suggestion click
  const selectSuggestion = useCallback((name: string) => {
    setNewSale({ ...newSale, customerName: name });
    setShowSuggestions(false);
    setSuggestions([]);
  }, [newSale, setNewSale]);

  // Calculate last month global summary (FIFO: unsold from before this month)
  const lastMonthSummary = useMemo(() => {
    const totalPeti = cageStocks.reduce((sum, c) => sum + c.lastPeti, 0);
    const totalSisaKg = cageStocks.reduce((sum, c) => sum + c.lastSisaKg, 0);
    return { totalPeti, totalSisaKg: Math.round(totalSisaKg * 100) / 100 };
  }, [cageStocks]);

  // Calculate current month global summary
  const currentMonthSummary = useMemo(() => {
    const totalPeti = cageStocks.reduce((sum, c) => sum + c.currPeti, 0);
    const totalSisaKg = cageStocks.reduce((sum, c) => sum + c.currSisaKg, 0);
    return { totalPeti, totalSisaKg: Math.round(totalSisaKg * 100) / 100 };
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

  // Handle edit an existing sale record
  const handleEditSale = (sale: any) => {
    const sourceCages: SelectedCage[] = (sale.sourceCages || []).map((c: any) => ({
      kandang: c.kandang,
      jmlPeti: c.jmlPeti,
      jmlKg: c.jmlKg,
    }));
    setNewSale({
      ...newSale,
      customerName: sale.customerName || "",
      hargaJual: sale.hargaJual || 0,
      pic: sale.pic || "",
    });
    setSelectedCages(sourceCages);
    setEditingSaleId(sale.id);
  };

  // Handle delete a sale record
  const handleDeleteSale = async (id: string) => {
    if (!confirm("Hapus penjualan ini?")) return;
    onDelete(id);
  };

  // Handle edit a cage card - open modal with existing values (non-destructive)
  const handleCageEdit = (cage: SelectedCage) => {
    setEditingCageKey(cage.kandang);
    setPickerSelectedCage(cage.kandang);
    setPickerPeti(cage.jmlPeti);
    setPickerKg(cage.jmlKg);
    setShowPickerModal(true);
  };

  // Check if there are unsaved changes in the form
  const hasUnsavedChanges = useMemo(() => {
    return selectedCages.length > 0 || newSale.customerName !== "" || newSale.hargaJual !== 0;
  }, [selectedCages, newSale]);

  // Cancel editing with confirmation if there are unsaved changes
  const cancelEdit = () => {
    if (hasUnsavedChanges && !confirm("Batalkan perubahan? Data yang sudah diisi akan hilang.")) {
      return;
    }
    setEditingSaleId(null);
    setSelectedCages([]);
    setEditingCageKey(null);
    setValidationError(null);
    setNewSale({
      ...newSale,
      customerName: "",
      hargaJual: 0,
      jmlPeti: 0,
      totalKg: 0,
      sourceCages: [],
      pic: "",
    });
  };

  // Handle add/update cage from modal
  const handleAddCage = () => {
    if (!pickerSelectedCage) return;
    if (pickerPeti === 0 && pickerKg === 0) return;

    // Check if exceeds remaining stock (account for current selection if editing)
    const remaining = remainingStocks.find((s) => s.kandang === pickerSelectedCage);
    const currentSelection = selectedCages.find(c => c.kandang === pickerSelectedCage);
    const availablePeti = (remaining?.remainingPeti || 0) + (editingCageKey ? (currentSelection?.jmlPeti || 0) : 0);
    
    if (pickerPeti > availablePeti) {
      setValidationError(`Stok tidak cukup! Tersedia: ${availablePeti} peti`);
      return;
    }

    // Update existing or add new
    if (editingCageKey) {
      setSelectedCages(selectedCages.map(c => 
        c.kandang === editingCageKey 
          ? { ...c, jmlPeti: pickerPeti, jmlKg: pickerKg }
          : c
      ));
    } else {
      // Prevent duplicate cage selection for new adds
      if (selectedCages.some((c) => c.kandang === pickerSelectedCage)) {
        setValidationError("Kandang ini sudah dipilih! Klik edit untuk mengubah.");
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
    }

    setShowPickerModal(false);
    setPickerSelectedCage(null);
    setPickerPeti(0);
    setPickerKg(0);
    setEditingCageKey(null);
    setValidationError(null);
  };

  // Handle save with validation
  const handleSave = () => {
    // Validate stock before save
    const validation = validateStock();
    if (!validation.valid) {
      setValidationError(validation.error || "Validasi gagal");
      return;
    }
    setValidationError(null);

    // Pass selected cage data directly to onSave callback (avoid async state issue)
    const saleData = {
      ...(editingSaleId ? { id: editingSaleId } : {}),
      customerName: newSale.customerName || "",
      hargaJual: newSale.hargaJual || 0,
      jmlPeti: totalPeti,
      totalKg: totalKg,
      sourceCages: selectedCages,
      pic: newSale.pic || "",
    };

    // Call onSave with the actual data
    onSave(saleData);

    // Reset after save
    setSelectedCages([]);
    setEditingSaleId(null);
    setNewSale({
      ...newSale,
      customerName: "",
      hargaJual: 0,
      jmlPeti: 0,
      totalKg: 0,
      sourceCages: [],
      pic: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Card - Stok */}
      <div className="bg-slate-900 md:p-8 p-5 rounded-[2rem] text-white">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="md:text-xl text-base font-black text-slate-400 uppercase tracking-tight">Status Stok</h3>
        </div>

        {/* Global Summary — Split into Last Month / This Month */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Last Month - Warm/Amber theme - text aligns right */}
          <div className="bg-amber-900/15 border border-amber-800/30 md:p-5 p-4 rounded-2xl text-right">
            <span className="text-xs font-black text-amber-400/80 uppercase tracking-widest">Sisa Bulan Lalu</span>
            <div className="md:text-2xl text-xl font-black mt-1 italic text-amber-200">
              {lastMonthSummary.totalPeti} <span className="text-sm font-black text-amber-400/70 uppercase not-italic">Peti</span> <span className="text-amber-700/50 mx-1">|</span> {lastMonthSummary.totalSisaKg} <span className="text-sm font-black text-amber-400/70 uppercase not-italic">Kg</span>
            </div>
          </div>
          {/* Current Month - Cool/Emerald theme - text aligns left */}
          <div className="bg-emerald-900/15 border border-emerald-800/30 md:p-5 p-4 rounded-2xl text-left">
            <span className="text-xs font-black text-emerald-400/80 uppercase tracking-widest">Stock Bulan Ini</span>
            <div className="md:text-2xl text-xl font-black mt-1 italic text-emerald-200">
              {currentMonthSummary.totalPeti} <span className="text-sm font-black text-emerald-400/70 uppercase not-italic">Peti</span> <span className="text-emerald-700/50 mx-1">|</span> {currentMonthSummary.totalSisaKg} <span className="text-sm font-black text-emerald-400/70 uppercase not-italic">Kg</span>
            </div>
          </div>
        </div>

        {/* Per-cage stock display — grid of cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cageStocks.map((cage) => (
            <div key={cage.kandang} className="md:p-4 p-3 rounded-xl border bg-slate-800/40 border-slate-700/40">
              {/* Header: cage name + total */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-black uppercase text-sm md:text-base text-slate-200">{cage.kandang}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total: {cage.peti}P | {cage.sisaKg}Kg
                </span>
              </div>
              {/* Two sub-cards side by side */}
              <div className="grid grid-cols-2 gap-2">
                {/* Last Month - Amber */}
                <div className="bg-amber-900/40 rounded-lg p-3 text-center space-y-1">
                  <div className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest">
                    Sisa Bln Lalu
                  </div>
                  <div className="text-sm md:text-base font-black text-amber-50">
                    {cage.lastPeti}<span className="text-xs font-bold text-amber-300/80">P</span>
                    <span className="text-amber-600/40 mx-1">|</span>
                    {cage.lastSisaKg}<span className="text-xs font-bold text-amber-300/80">Kg</span>
                  </div>
                </div>
                {/* This Month - Emerald */}
                <div className="bg-emerald-900/40 rounded-lg p-3 text-center space-y-1">
                  <div className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">
                    Stock Bln Ini
                  </div>
                  <div className="text-sm md:text-base font-black text-emerald-50">
                    {cage.currPeti}<span className="text-xs font-bold text-emerald-300/80">P</span>
                    <span className="text-emerald-600/40 mx-1">|</span>
                    {cage.currSisaKg}<span className="text-xs font-bold text-emerald-300/80">Kg</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEditable && (
        <div className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Entri Penjualan</h3>

          {/* 1. Input Fields */}
          <div className="bg-slate-50 rounded-[1.5rem] p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-xs uppercase text-slate-500 font-black tracking-widest px-1">
                  Nama Customer
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g. Toko Berkah"
                  autoComplete="off"
                  value={newSale.customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onKeyDown={handleCustomerNameKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:font-medium placeholder:text-slate-300"
                />
                {/* Suggestion dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((name, i) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion(name);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(i)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                          i === selectedSuggestionIndex
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                {loadingSuggestions && (
                  <div className="absolute top-full mt-1 left-0 right-0 flex items-center justify-center py-2 bg-white border border-slate-200 rounded-xl shadow-lg">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* PIC */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-black tracking-widest px-1">
                  PIC
                </label>
                <select
                  value={newSale.pic || ""}
                  onChange={(e) => setNewSale({ ...newSale, pic: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Pilih PIC...</option>
                  {salesWorkers.map((w: any) => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Harga Jual */}
            <div className="mt-4">
              <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-black tracking-widest px-1">
                  Harga Jual (Rp)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(newSale.hargaJual) || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const num = parseInt(raw) || 0;
                      setNewSale({ ...newSale, hargaJual: num });
                    }}
                    className="w-full px-4 py-3 pr-28 bg-white border border-slate-200 rounded-xl font-black text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:font-medium placeholder:text-slate-300"
                  />
                  {hargaSentral > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md pointer-events-none select-none whitespace-nowrap">
                      Rp {formatNumber(hargaSentral)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. "Pilih Kandang" Button - show availability status */}
          {!hasAnyStock ? (
            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center mb-4">
              <span className="inline-flex items-center gap-2 text-slate-400 font-bold">
                <span className="text-2xl">✕</span>
                <span>Tidak ada stok tersedia</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingCageKey(null);
                setPickerSelectedCage(null);
                setPickerPeti(0);
                setPickerKg(0);
                setShowPickerModal(true);
              }}
              className="w-full bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
            >
              <span className="inline-flex items-center gap-2 text-slate-600 font-bold">
                <span className="text-2xl">+</span>
                <span>Pilih Kandang</span>
              </span>
            </button>
          )}

          {/* Visual hint when form is partially filled but no cages selected */}
          {(newSale.customerName || newSale.hargaJual > 0) && selectedCages.length === 0 && hasAnyStock && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Mohon pilih kandang untuk menyelesaikan entri</span>
            </div>
          )}

          {/* 3. Selected Cages Stacked Cards */}
          {selectedCages.length > 0 && (
            <div className="space-y-3 mb-4">
              {selectedCages.map((cage) => {
                const remaining = remainingStocks.find(s => s.kandang === cage.kandang);
                // Show FIFO allocation breakdown
                const fromLast = Math.min(cage.jmlPeti, (remaining as any)?.lastPeti ?? 0);
                const fromCurr = cage.jmlPeti - fromLast;
                // Kg FIFO
                const fromLastKg = Math.min(cage.jmlKg, (remaining as any)?.lastSisaKg ?? 0);
                const fromCurrKg = Math.max(0, cage.jmlKg - fromLastKg);
                return (
                  <div key={cage.kandang} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-black text-slate-900">Kandang {cage.kandang}</span>
                        <span className="text-xs text-blue-600 ml-2">
                          {remaining?.remainingPeti || 0} peti tersedia
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleCageEdit(cage)} 
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit alokasi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeCage(cage.kandang)} 
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Ambil: <strong>{cage.jmlPeti}</strong> peti</span>
                      <span><strong>{cage.jmlKg}</strong> kg</span>
                    </div>
                    {(cage.jmlPeti > 0 || cage.jmlKg > 0) && (
                      <div className="mt-2 text-[10px] text-blue-600 font-medium space-y-1">
                        {cage.jmlPeti > 0 && (
                          <div>
                            {fromLast > 0 ? `${fromLast} peti dari stok bulan lalu` : ''}
                            {fromLast > 0 && fromCurr > 0 ? ', ' : ''}
                            {fromCurr > 0 ? `${fromCurr} peti dari stok bulan ini` : ''}
                          </div>
                        )}
                        {cage.jmlKg > 0 && (
                          <div>
                            {cage.jmlKg} kg → {fromLastKg > 0 ? `${fromLastKg} kg dari stok bulan lalu` : ''}
                            {fromLastKg > 0 && fromCurrKg > 0 ? ', ' : ''}
                            {fromCurrKg > 0 ? `${fromCurrKg} kg dari stok bulan ini` : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Total Summary */}
          {selectedCages.length > 0 && (
            <div className="bg-blue-100 rounded-xl p-4 text-center mb-4">
              <span className="text-sm font-bold text-blue-800">
                {formatNumber(totalPeti)} Peti + {formatNumber(selectedCages.reduce((sum, c) => sum + c.jmlKg, 0))} Kg
              </span>
            </div>
          )}

          {/* 5. Validation Error */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 6. Save / Update Button - now at bottom */}
          <div className="flex gap-3">
            {editingSaleId && (
              <button
                onClick={cancelEdit}
                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={selectedCages.length === 0 || !newSale.customerName || !newSale.pic || newSale.hargaJual === 0}
              className={`${editingSaleId ? 'flex-1' : 'w-full'} bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {editingSaleId ? "Update Penjualan" : "Tambah Penjualan"}
            </button>
          </div>
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
              setEditingCageKey(null);
              setValidationError(null);
            }
          }}
        >
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                  {editingCageKey ? `Edit ${editingCageKey}` : 'Pilih Kandang'}
                </h3>
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                  {editingCageKey ? 'Ubah alokasi stok' : 'Alokasi Stok Penjualan'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowPickerModal(false);
                  setPickerSelectedCage(null);
                  setPickerPeti(0);
                  setPickerKg(0);
                  setEditingCageKey(null);
                  setValidationError(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cage Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
                      className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50 shadow shadow-blue-500/10" 
                          : isDisabled
                            ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                            : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-black text-sm sm:text-base block text-slate-900">
                        {cage.kandang}
                      </span>
                      <div className={`text-[11px] sm:text-xs font-black ${isDisabled ? 'text-slate-400' : 'text-blue-600'}`}>
                        {remaining?.remainingPeti || 0} <span className="opacity-60 font-medium">Peti</span>
                        {remaining && remaining.sisaKg > 0 && <> | {remaining.sisaKg} <span className="opacity-60 font-medium">Kg</span></>}
                      </div>
                    </button>
                  );
                })}
              </div>

{/* Qty Input (only if cage selected) */}
              {pickerSelectedCage && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 animate-in slide-in-from-top-2">
                  {(() => {
                    const remaining = remainingStocks.find(s => s.kandang === pickerSelectedCage);
                    const currentSelection = selectedCages.find(c => c.kandang === pickerSelectedCage);
                    const availablePeti = (remaining?.remainingPeti || 0) + (editingCageKey ? (currentSelection?.jmlPeti || 0) : 0);
                    const exceedsStock = pickerPeti > availablePeti;
                    // Strict FIFO: compute how many peti come from last month vs current month
                    const lastAvail = remaining?.lastMonthRemainingPeti ?? 0;
                    const entered = pickerPeti;
                    const fromLast = Math.min(entered, lastAvail);
                    const fromCurr = Math.max(0, entered - fromLast);
                    // Kg FIFO
                    const lastSisaKg = remaining?.lastSisaKg ?? 0;
                    const fromLastKg = Math.min(pickerKg, lastSisaKg);
                    const fromCurrKg = Math.max(0, pickerKg - fromLastKg);
                    return (
                      <>
                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest text-center mb-3">Input Pengambilan</div>
                        {exceedsStock && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                            <span className="text-xs font-black text-red-600 uppercase">
                              ⚠️ Melebihi stok! (Max: {availablePeti})
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2 sm:gap-4">
                          <div className="flex-1">
                            <label className="text-xs font-black uppercase text-slate-600 block mb-2 text-center">Peti</label>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={pickerPeti} 
                              onChange={e => setPickerPeti(parseInt(e.target.value) || 0)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCage();
                                }
                              }}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg font-black text-base sm:text-lg text-center outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-black uppercase text-slate-600 block mb-2 text-center">Sisa Kg</label>
                            <input 
                              type="number" 
                              inputMode="decimal"
                              value={pickerKg} 
                              onChange={e => {
                                const v = parseFloat(e.target.value) || 0;
                                setPickerKg(v >= 15 ? v % 15 : v);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCage();
                                }
                              }}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg font-black text-base sm:text-lg text-center outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" 
                            />
                          </div>
                        </div>

                        {/* Strict FIFO allocation display */}
                        {(entered > 0 || pickerKg > 0) && !exceedsStock && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg text-center space-y-1">
                            {entered > 0 && (
                              <div className="text-xs font-bold text-blue-800">
                                {entered} peti → {fromLast > 0 ? `${fromLast} peti dari stok bulan lalu` : ''}
                                {fromLast > 0 && fromCurr > 0 ? ', ' : ''}
                                {fromCurr > 0 ? `${fromCurr} peti dari stok bulan ini` : ''}
                              </div>
                            )}
                            {pickerKg > 0 && (
                              <div className="text-xs font-bold text-blue-800">
                                {pickerKg} kg → {fromLastKg > 0 ? `${fromLastKg} kg dari stok bulan lalu` : ''}
                                {fromLastKg > 0 && fromCurrKg > 0 ? ', ' : ''}
                                {fromCurrKg > 0 ? `${fromCurrKg} kg dari stok bulan ini` : ''}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Submit Button */}
              <button 
                onClick={handleAddCage}
                disabled={!pickerSelectedCage || (pickerPeti === 0 && pickerKg === 0)}
                className="w-full bg-slate-900 text-white font-black py-3 rounded-xl disabled:bg-slate-300 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20 uppercase tracking-widest text-sm"
              >
                {editingCageKey ? 'Update Penjualan' : 'Tambah ke Penjualan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {data.length > 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base">Penjualan Hari Ini</h3>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
              {data.length} Records
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {data.map((sale: any) => (
              <div key={sale.id} className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors active:bg-slate-50">
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base truncate">{sale.customerName}</h4>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-md">{formatNumber(sale.jmlPeti)} Peti</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-md">{formatNumber(sale.totalKg % 15)} KG</span>
                  </div>
                  {sale.sourceCages && sale.sourceCages.length > 0 && (
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-2">
                      Via: {sale.sourceCages.map((c: any) => `${c.kandang}(${c.jmlPeti})`).join(', ')}
                    </p>
                  )}
                  {sale.pic && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-md">
                      PIC: {sale.pic}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base sm:text-lg font-black text-slate-900 italic">Rp {formatNumber(sale.subTotal)}</p>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-tighter">@{formatNumber(sale.hargaJual)}</p>
                </div>
                {isEditable && (
                  <div className="flex flex-col gap-1 ml-3">
                    <button
                      onClick={() => handleEditSale(sale)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
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