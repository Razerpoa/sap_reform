"use client";

import { useEffect, useState, useMemo } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  BarChart3,
  Calendar,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

type Timeframe = "daily" | "weekly" | "monthly";
type SortBy = "latest" | "highest";
type ViewMode = "log" | "chart";
type Metric = "kg" | "telur" | "rp";

export default function Profit() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    production: any[];
    cashflow: any[];
    sales: any[];
    expenses: any[];
  }>({
    production: [],
    cashflow: [],
    sales: [],
    expenses: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const ts = Date.now();
      const [productionRes, cashflowRes, salesRes, expensesRes] = await Promise.all([
        fetch(`/api/production?_t=${ts}`),
        fetch(`/api/cashflow?_t=${ts}`),
        fetch(`/api/sales?_t=${ts}`),
        fetch(`/api/expense?_t=${ts}`),
      ]);

      setData({
        production: await productionRes.json(),
        cashflow: await cashflowRes.json(),
        sales: await salesRes.json(),
        expenses: await expensesRes.json(),
      });
    } catch (err) {
      console.error("[Profit] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const { production, cashflow, sales, expenses } = data;

    // Gross Revenue = sum of Sales subTotal
    const totalGrossRevenue = sales.reduce((sum: number, s: any) => sum + (s.subTotal || 0), 0);

    // Total Expenses = from CashFlow (biayaPakan + biayaOperasional + salaries + devidenA + devidenB) + OtherExpense
    let totalExpenses = 0;
    cashflow.forEach((cf: any) => {
      const salariesTotal = cf.salaries ? Object.values(cf.salaries).reduce((a: number, b: any) => a + (b || 0), 0) : 0;
      totalExpenses += (cf.biayaPakan || 0) + (cf.biayaOperasional || 0) + salariesTotal + (cf.devidenA || 0) + (cf.devidenB || 0);
    });
    expenses.forEach((e: any) => {
      totalExpenses += e.amount || 0;
    });

    return { totalGrossRevenue, totalExpenses };
  }, [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-400 font-medium">Loading profit data...</p>
        </div>
      </div>
    );
  }

return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laba dan Rugi</h1>
        <p className="text-sm text-slate-500">Ringkasan pendapatan dan pengeluaran</p>
      </div>

      <div className="space-y-4">
        {/* Gross Revenue Card */}
        <ProfitCard
          label="Pendapatan Kotor"
          amount={totals.totalGrossRevenue}
          data={data}
          type="gross"
        />

        {/* Total Expenses Card */}
        <ProfitCard
          label="Total Pengeluaran"
          amount={totals.totalExpenses}
          data={data}
          type="expenses"
        />
      </div>
    </div>
  );
}

function ProfitCard({
  label,
  amount,
  isExpanded,
  data,
  type,
}: {
  label: string;
  amount: number;
  isExpanded?: boolean;
  data: {
    production: any[];
    cashflow: any[];
    sales: any[];
    expenses: any[];
  };
  type: "gross" | "expenses";
}) {
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("log");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [metric, setMetric] = useState<Metric>("rp");

  const isProfit = type === "gross";

  // Build transaction log based on type
  const transactions = useMemo(() => {
    const items: Array<{ date: Date; description: string; amount: number; type: string }> = [];

    if (type === "gross") {
      data.sales.forEach((sale: any) => {
        items.push({
          date: new Date(sale.date),
          description: `${sale.customerName} - ${sale.jmlPeti} peti × ${sale.totalKg}kg @ Rp ${sale.hargaJual?.toLocaleString()}`,
          amount: sale.subTotal || 0,
          type: "sale",
        });
      });
    } else {
      data.cashflow.forEach((cf: any) => {
        const date = new Date(cf.date);
        if (cf.biayaPakan > 0) {
          items.push({ date, description: "Biaya Pakan", amount: cf.biayaPakan, type: "feed" });
        }
        if (cf.biayaOperasional > 0) {
          items.push({ date, description: "Biaya Operasional", amount: cf.biayaOperasional, type: "ops" });
        }
        if (cf.salaries) {
          Object.entries(cf.salaries).forEach(([workerId, salary]: [string, any]) => {
            if (salary > 0) items.push({ date, description: `Gaji (${workerId})`, amount: salary, type: "salary" });
          });
        }
        if (cf.devidenA > 0) {
          items.push({ date, description: "Deviden A", amount: cf.devidenA, type: "dividend" });
        }
        if (cf.devidenB > 0) {
          items.push({ date, description: "Deviden B", amount: cf.devidenB, type: "dividend" });
        }
      });
      data.expenses.forEach((e: any) => {
        items.push({ date: new Date(e.date), description: e.description, amount: e.amount, type: "other" });
      });
    }

    if (sortBy === "latest") {
      items.sort((a, b) => b.date.getTime() - a.date.getTime());
    } else {
      items.sort((a, b) => b.amount - a.amount);
    }
    return items;
  }, [data, type, sortBy]);

  // Chart data
  const chartData = useMemo(() => {
    if (type === "gross") {
      if (viewMode !== "chart") return [];
      const dates = data.sales.map((s) => new Date(s.date)).filter((d) => !isNaN(d.getTime()));
      if (!dates.length) return [];
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      const intervals = timeframe === "daily" ? eachDayOfInterval({ start: minDate, end: maxDate })
        : timeframe === "weekly" ? eachWeekOfInterval({ start: minDate, end: maxDate, weekStartsOn: 1 })
        : eachMonthOfInterval({ start: minDate, end: maxDate });

      return intervals.map((intervalStart) => {
        const start = timeframe === "daily" ? startOfDay(intervalStart)
          : timeframe === "weekly" ? startOfWeek(intervalStart, { weekStartsOn: 1 })
          : startOfMonth(intervalStart);
        const end = timeframe === "daily" ? endOfDay(intervalStart)
          : timeframe === "weekly" ? endOfWeek(intervalStart, { weekStartsOn: 1 })
          : endOfMonth(intervalStart);

        const relevant = data.sales.filter((s) => isWithinInterval(new Date(s.date), { start, end }));
        let total = 0;
        if (metric === "rp") total = relevant.reduce((sum: number, s: any) => sum + (s.subTotal || 0), 0);
        else if (metric === "kg") total = relevant.reduce((sum: number, s: any) => sum + (s.totalKg || 0), 0);
        else if (metric === "telur") total = relevant.reduce((sum: number, s: any) => sum + (s.totalKg || 0), 0) / 0.05;

        return { name: format(intervalStart, timeframe === "monthly" ? "MMM yyyy" : "dd MMM", { locale: id }), value: total };
      });
    } else {
      if (viewMode !== "chart") return [];
      const allExpenses = [...data.cashflow, ...data.expenses];
      const dates = allExpenses.map((e) => new Date(e.date)).filter((d) => !isNaN(d.getTime()));
      if (!dates.length) return [];

      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      const intervals = timeframe === "daily" ? eachDayOfInterval({ start: minDate, end: maxDate })
        : timeframe === "weekly" ? eachWeekOfInterval({ start: minDate, end: maxDate, weekStartsOn: 1 })
        : eachMonthOfInterval({ start: minDate, end: maxDate });

      return intervals.map((intervalStart) => {
        const start = timeframe === "daily" ? startOfDay(intervalStart)
          : timeframe === "weekly" ? startOfWeek(intervalStart, { weekStartsOn: 1 })
          : startOfMonth(intervalStart);
        const end = timeframe === "daily" ? endOfDay(intervalStart)
          : timeframe === "weekly" ? endOfWeek(intervalStart, { weekStartsOn: 1 })
          : endOfMonth(intervalStart);

        const cfExpenses = data.cashflow.filter((cf) => isWithinInterval(new Date(cf.date), { start, end }))
          .reduce((sum: number, cf: any) => {
            const salariesTotal = cf.salaries ? Object.values(cf.salaries).reduce((a: number, b: any) => a + (b || 0), 0) : 0;
            return sum + (cf.biayaPakan || 0) + (cf.biayaOperasional || 0) + salariesTotal + (cf.devidenA || 0) + (cf.devidenB || 0);
          }, 0);
        const otherExpenses = data.expenses.filter((e) => isWithinInterval(new Date(e.date), { start, end }))
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        return { name: format(intervalStart, timeframe === "monthly" ? "MMM yyyy" : "dd MMM", { locale: id }), value: cfExpenses + otherExpenses };
      });
    }
  }, [data, type, viewMode, timeframe, metric]);

  // Transaction count for additional info
  const transactionCount = transactions.length;

  return (
    <div className={cn(
      "bg-white rounded-3xl border shadow-sm transition-all overflow-hidden",
      "border-slate-200"
    )}>
      {/* Card Header - Always Visible */}
      <div className="w-full p-5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isProfit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total</p>
              <p className={cn(
                "text-2xl font-black",
                isProfit ? "text-emerald-600" : "text-red-600"
              )}>
                {`Rp ${formatNumber(amount)}`}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">{transactionCount} transaksi</p>
            </div>
          </div>
          
          {/* View Toggle - Left side of card */}
          <div className="flex bg-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("log")}
              className={cn(
                "px-3 py-2 flex items-center justify-center gap-1 font-black text-xs transition-colors",
                viewMode === "log" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
              )}
            >
              <FileText className="w-3 h-3" />
              Log
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={cn(
                "px-3 py-2 flex items-center justify-center gap-1 font-black text-xs transition-colors",
                viewMode === "chart" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
              )}
            >
              <BarChart3 className="w-3 h-3" />
              Chart
            </button>
          </div>
        </div>
      </div>

      {/* Card Content - Always Visible */}
      <div className="border-t border-slate-100">
        {/* Controls - Sort dropdown in log mode */}
        <div className="p-4 bg-slate-50">
          {viewMode === "log" && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm appearance-none cursor-pointer"
            >
              <option value="latest">Terbaru</option>
              <option value="highest">Terbesar</option>
            </select>
          )}

            {/* Chart Controls */}
            {viewMode === "chart" && (
              <div className="flex gap-2">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm appearance-none cursor-pointer"
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-sm appearance-none cursor-pointer"
                >
                  <option value="rp">Rupiah (Rp)</option>
                  <option value="kg">Kilogram (Kg)</option>
                  <option value="telur">Telur (Butir)</option>
                </select>
              </div>
            )}
          </div>

          {/* Log View */}
          {viewMode === "log" && (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {transactions.length > 0 ? (
                transactions.map((t, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{t.description}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {format(t.date, "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                      <p className={cn(
                        "text-base font-black shrink-0",
                        isProfit ? "text-emerald-600" : "text-red-600"
                      )}>
                        {formatNumber(t.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium text-sm">Tidak ada data</p>
                </div>
              )}
            </div>
          )}

          {/* Chart View */}
          {viewMode === "chart" && (
            <div className="p-4">
              <div className="h-[200px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                        tickFormatter={(val) => val.toLocaleString()}
                        width={60}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "16px",
                          border: "1px solid #f1f5f9",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                          padding: "10px 14px",
                        }}
                        itemStyle={{ fontSize: "11px", fontWeight: 800 }}
                        formatter={(value: any) => [Number(value || 0).toLocaleString(), ""]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={isProfit ? "Pendapatan" : "Pengeluaran"}
                        stroke={isProfit ? "#059669" : "#dc2626"}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic font-medium">
                    Tidak ada data tersedia
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}