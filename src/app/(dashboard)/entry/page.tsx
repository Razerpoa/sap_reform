"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { getWIBDateString } from "@/lib/date-utils";
import { useSession } from "next-auth/react";
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar,
  ShoppingBag,
  Wallet,
  Settings2,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ProductionForm } from "@/components/production/ProductionForm";
import { CashFlowForm } from "@/components/cashflow/CashFlowForm";
import { SalesSection } from "@/components/sales/SalesSection";
import { MasterForm } from "@/components/master/MasterForm";
import { useDraft } from "@/hooks/useDraft";
import { useUserRole } from "@/hooks/useUserRole";

type Tab = "production" | "master" | "cashflow" | "sales";

export default function EntryPage() {
  const { data: session } = useSession();
  const { role: userRole, isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState<Tab>("production");
  const [selectedDate, setSelectedDate] = useState(getWIBDateString());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Form States
  const [productionData, setProductionData] = useState<any>({});
  const [masterData, setMasterData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any>({ date: new Date() });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<any[]>([]);
  const [newSale, setNewSale] = useState<any>({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0, sourceCages: [] });
  const [stockData, setStockData] = useState<any[]>([]);
  const [cages, setCages] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState<any>({ amount: 0, description: "" });
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Original data (baseline) - used to detect if user actually made edits
  const [originalData, setOriginalData] = useState<Record<Tab, any>>({
    production: {},
    cashflow: {},
    sales: null,
    master: null,
  });

  // Check if current data differs from original (user made actual edits)
  const hasChanges = useCallback((tab: Tab): boolean => {
    const original = originalData[tab];
    const current = getData(tab);
    if (!original || !current) return false;
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [originalData, productionData, cashFlowData, newSale]);

  const isEditable = useMemo(() => {
    if (!isAdmin) return false; // Whitelisted users can only read
    return true; // Admins can edit any date (past or today)
  }, [isAdmin]);

  // Check if draft exists AND user made actual changes
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draftKey = `draft-${activeTab}-${selectedDate}`;
    const storedDraft = localStorage.getItem(draftKey);
    if (!storedDraft) {
      setHasDraft(false);
      return;
    }
    // Only show draft bar if user actually changed data from original
    const original = originalData[activeTab];
    const current = getData(activeTab);
    const hasUserChanges = original && current && JSON.stringify(current) !== JSON.stringify(original);
    setHasDraft(!!hasUserChanges);
  }, [activeTab, selectedDate, originalData, productionData, cashFlowData, newSale]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  async function fetchData() {
    const draftKey = `draft-${activeTab}-${selectedDate}`;
    const dateStr = selectedDate;
    const ts = Date.now();

    // For sales tab: fetch sales data, stock data, and cages
    if (activeTab === "sales") {
      setLoading(true);
      setError(null);

      try {
        // Check for draft
        const draftKey = `draft-${activeTab}-${selectedDate}`;
        const draftData = localStorage.getItem(draftKey);
        if (draftData) {
          // Load draft
          const parsed = JSON.parse(draftData);
          setNewSale({
            customerName: parsed.customerName || "",
            jmlPeti: parsed.jmlPeti || 0,
            totalKg: parsed.totalKg || 0,
            hargaJual: parsed.hargaJual || 0,
            sourceCages: parsed.sourceCages || []
          });
          // Set original to draft data (user hasn't edited yet relative to draft)
          setOriginalData(prev => ({ ...prev, sales: { ...parsed } }));

          // Fetch sales list to display existing records
          const [salesRes, stockRes, cagesRes] = await Promise.all([
            fetch(`/api/sales?date=${dateStr}&_t=${ts}`),
            fetch(`/api/cage-stock?_t=${ts}`),
            fetch(`/api/master?_t=${ts}`)
          ]);
          const salesData = await salesRes.json();
          const stockData = await stockRes.json();
          const cagesData = await cagesRes.json();

          setSalesData(salesData || []);
          setStockData(Object.entries(stockData || {}).map(([kandang, v]: any) => ({ kandang: kandang, ...v })));
          setCages(cagesData || []);

          setLoading(false);
          return;
        }

        // No draft, fetch all data in parallel
        const [salesRes, stockRes, cagesRes] = await Promise.all([
          fetch(`/api/sales?date=${dateStr}&_t=${ts}`),
          fetch(`/api/cage-stock?_t=${ts}`),
          fetch(`/api/master?_t=${ts}`)
        ]);

        const salesData = await salesRes.json();
        const stockData = await stockRes.json();
        const cagesData = await cagesRes.json();

        setSalesData(salesData || []);
        setStockData(Object.entries(stockData || {}).map(([kandang, v]: any) => ({ kandang: kandang, ...v })));
        setCages(cagesData || []);
        // Reset newSale to empty and set as original baseline
        const emptySale = { customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0, sourceCages: [] };
        setNewSale(emptySale);
        setOriginalData(prev => ({ ...prev, sales: emptySale }));
      } catch (err: any) {
        console.error("[fetchData] error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
      return;
    }

    // For other tabs: always fetch from database, draft will overlay via useDraft hook
    // Note: UseDraft's onLoad will overlay draft data after DB data is loaded

    setLoading(true);
    setError(null);

    try {
      if (activeTab === "production") {
        const [productionRes, stockRes] = await Promise.all([
          fetch(`/api/production?date=${dateStr}&_t=${ts}`),
          fetch(`/api/cage-stock?_t=${ts}`),
        ]);
        if (!productionRes.ok) throw new Error("production failed");
        const productionDataResponse = await productionRes.json();
        const stockData = await stockRes.json();
        setProductionData(productionDataResponse || {});
        setStockData(Object.entries(stockData || {}).map(([kandang, v]: any) => ({ kandang: kandang, ...v })));
        // Set as original baseline for change detection
        setOriginalData(prev => ({ ...prev, production: productionDataResponse || {} }));
      } else if (activeTab === "master") {
        try {
          const res = await fetch(`/api/master?_t=${ts}`);
          const data = await res.json();
          setMasterData(Array.isArray(data) ? data : []);
        } catch {
          setMasterData([]);
        }
      } else if (activeTab === "cashflow") {
        const [cashflowRes, expensesRes] = await Promise.all([
          fetch(`/api/cashflow?date=${dateStr}&_t=${ts}`),
          fetch(`/api/expense?date=${dateStr}&_t=${ts}`),
        ]);
        const cashflowData = await cashflowRes.json();
        const expensesData = await expensesRes.json();
        const cashflowEntry = cashflowData[0] || { date: new Date(selectedDate) };
        setCashFlowData(cashflowEntry);
        setOtherExpenses(Array.isArray(expensesData) ? expensesData : []);
        // Set as original baseline for change detection
        setOriginalData(prev => ({ ...prev, cashflow: cashflowEntry }));
      }
    } catch (err: any) {
      console.error("[fetchData] error:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(saleData?: any) {
    if (!isEditable) return;
    setSaving(true);
    setIsSavingDraft(true); // Prevent auto-save during save
    setError(null);
    setSuccess(false);

    try {
      let endpoint = `/api/${activeTab}`;
      let body: any = {};

      if (activeTab === "production") {
        body = { ...productionData, date: selectedDate };
      } else if (activeTab === "cashflow") {
        body = { ...cashFlowData, date: selectedDate };
      } else if (activeTab === "sales") {
        // Use passed saleData directly (avoids async state issue)
        body = { ...saleData, date: selectedDate };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        draft.clearDraft();
        setHasDraft(false); // Immediately hide draft bar
        if (activeTab === "production") {
          // Re-fetch BOTH production entry AND stock data
          const ts = Date.now();
          const [prodRes, stockRes] = await Promise.all([
            fetch(`/api/production?date=${selectedDate}&_t=${ts}`),
            fetch(`/api/cage-stock?_t=${ts}`)
          ]);
          const prodData = await prodRes.json();
          const stockData = await stockRes.json();
          setProductionData(prodData || {});
          setStockData(Object.entries(stockData || {}).map(([kandang, v]: any) => ({ kandang: kandang, ...v })));
        }
        if (activeTab === "sales") {
          // Clear sales form and re-fetch sales list + stock data
          setNewSale({ customerName: "", jmlPeti: 0, totalKg: 0, hargaJual: 0, sourceCages: [] });
          const ts = Date.now();
          const [salesRes, stockRes] = await Promise.all([
            fetch(`/api/sales?date=${selectedDate}&_t=${ts}`),
            fetch(`/api/cage-stock?_t=${ts}`)
          ]);
          const salesData = await salesRes.json();
          const stockData = await stockRes.json();
          setSalesData(salesData || []);
          setStockData(Object.entries(stockData || {}).map(([kandang, v]: any) => ({ kandang: kandang, ...v })));
        }
        
        await new Promise(r => setTimeout(r, 100));
        
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
      setIsSavingDraft(false); // Re-enable auto-save
    }
  }

  // Helper functions to get data/setter based on tab
  function getDataSetter(tab: Tab): (data: any) => void {
    switch (tab) {
      case "production": return setProductionData;
      case "cashflow": return setCashFlowData;
      case "sales": return setNewSale;
      default: return () => {};
    }
  }

  function getData(tab: Tab): any {
    switch (tab) {
      case "production": return productionData;
      case "cashflow": return cashFlowData;
      case "sales": return newSale;
      default: return {};
    }
  }

  // useDraft hook for auto-save/load
  const draft = useDraft({
    tab: activeTab,
    date: selectedDate,
    onLoad: useCallback((data: any) => {
      const setter = getDataSetter(activeTab);
      setter(data);
    }, [activeTab]),
  });

  // Auto-save to draft when data changes (only if user actually edited something)
  useEffect(() => {
    if (isSavingDraft) return;
    // Only save draft if user made actual changes from original
    if (!hasChanges(activeTab)) return;
    const currentData = getData(activeTab);
    if (currentData && Object.keys(currentData).length > 0) {
      draft.saveDraft(currentData);
      setHasDraft(true); // Show button
    }
  }, [productionData, cashFlowData, newSale, activeTab, draft, isSavingDraft, hasChanges, originalData]);

  const tabConfig = [
    { id: "production", icon: TrendingUp, label: "Produksi" },
    { id: "cashflow", icon: Wallet, label: "Arus Kas" },
    { id: "sales", icon: ShoppingBag, label: "Penjualan" },
    { id: "master", icon: Settings2, label: "Data Master" },
  ];

  const titleMap: Record<Tab, string> = {
    production: "Entri Produksi",
    cashflow: "Arus Kas",
    sales: "Penjualan",
    master: "Data Master",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">
            {titleMap[activeTab]}
          </h1>
          <p className={cn("text-sm", isEditable ? "text-slate-500" : "text-amber-600 font-bold flex items-center gap-1")}>
            {isEditable ? "Update catatan harian" : <><AlertCircle className="w-4 h-4" /> Baca-saja: Riwayat</>}
          </p>
        </div>
        
        {activeTab !== "master" && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker();
                } catch (error) {
                  console.log("Browser does not support showPicker");
                }
              }}
              className="text-sm font-bold outline-none bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        {tabConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center",
              activeTab === t.id 
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Data saved successfully
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-400 font-medium">Fetching details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "production" && (
            <ProductionForm 
              data={productionData} 
              setData={setProductionData} 
              isEditable={isEditable}
              date={selectedDate}
              stockData={stockData}
            />
          )}
          {activeTab === "cashflow" && (
            <CashFlowForm 
              data={cashFlowData} 
              setData={setCashFlowData} 
              isEditable={isEditable}
              otherExpenses={otherExpenses}
              setOtherExpenses={setOtherExpenses}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              editingExpense={editingExpense}
              setEditingExpense={setEditingExpense}
              selectedDate={selectedDate}
            />
          )}
          {activeTab === "sales" && (
            <SalesSection 
              data={salesData} 
              newSale={newSale} 
              setNewSale={setNewSale} 
              isEditable={isEditable} 
              onSave={handleSave}
              stockData={stockData}
              cages={cages}
            />
          )}
          {activeTab === "master" && (
            <MasterForm 
              data={masterData} 
              onSave={fetchData} 
            />
          )}
        </div>
      )}

      {/* Draft Save Bar - only show when draft exists */}
      {isEditable && hasDraft && (activeTab === "production" || activeTab === "cashflow") && (
        <div className="fixed bottom-27 sm:bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl p-5 flex items-center justify-between z-40">
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase font-black text-slate-400">Status</p>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              Draft ditemukan
            </h4>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Simpan Draft
          </button>
        </div>
      )}
    </div>
  );
}