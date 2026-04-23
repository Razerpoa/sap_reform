"use client";

import { useEffect, useState, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";

type Timeframe = "daily" | "weekly" | "monthly" | "annually";

const CAGE_CONFIG = {
  b1: { label: "B1", color: "#000000" },
  b1p: { label: "B1+", color: "#000000" },
  b2: { label: "B2", color: "#000000" },
  b2p: { label: "B2+", color: "#000000" },
  b3: { label: "B3", color: "#000000" },
  b3p: { label: "B3+", color: "#000000" },
};

type CageKey = keyof typeof CAGE_CONFIG;

// Map master data kandangs to cage keys
const KANDANG_TO_CAGE: Record<string, CageKey> = {
  "B1": "b1",
  "B1+": "b1p",
  "B2": "b2",
  "B2+": "b2p",
  "B3": "b3",
  "B3+": "b3p",
};

export default function Produksi() {
  const [masterData, setMasterData] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [metric, setMetric] = useState<"kg" | "telur">("kg");
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<CageKey | null>(null);
  const [thirtyDayAvg, setThirtyDayAvg] = useState<Record<CageKey, number>>({} as Record<CageKey, number>);
  const [cageTimeframes, setCageTimeframes] = useState<Record<CageKey, Timeframe>>({} as Record<CageKey, Timeframe>);

  async function fetchData() {
    const ts = Date.now();
    setLoading(true);
    try {
      const [masterRes, productionRes] = await Promise.all([
        fetch(`/api/master?_t=${ts}`),
        fetch(`/api/production?_t=${ts}`),
      ]);
      const master = masterRes.ok ? await masterRes.json() : [];
      const production = productionRes.ok ? await productionRes.json() : [];
      setMasterData(Array.isArray(master) ? master : []);
      setProductionData(Array.isArray(production) ? production : []);
    } catch {
      setMasterData([]);
      setProductionData([]);
    } finally {
      setLoading(false);
    }
  }

  // Calculate 30-day average kg per cage
  const calculateThirtyDayAvg = useMemo((): Record<CageKey, number> => {
    if (!productionData.length) return {} as Record<CageKey, number>;

    const dates = productionData.map((p) => new Date(p.date)).filter((d) => !isNaN(d.getTime()));
    if (!dates.length) return {} as Record<CageKey, number>;

    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const thirtyDaysAgo = new Date(maxDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result: Record<CageKey, number> = {} as Record<CageKey, number>;

    (Object.keys(CAGE_CONFIG) as CageKey[]).forEach((cageKey) => {
      const kgKey = `${cageKey}Kg` as keyof typeof productionData[0];

      const recentData = productionData.filter((p) => {
        const d = new Date(p.date);
        return d >= thirtyDaysAgo && d <= maxDate;
      });

      let totalKg = 0;
      recentData.forEach((p) => {
        totalKg += Number(p[kgKey]) || 0;
      });

      result[cageKey] = totalKg / 30;
    });

    return result;
  }, [productionData]);

  // Update thirtyDayAvg when calculation changes
  useEffect(() => {
    setThirtyDayAvg(calculateThirtyDayAvg);
  }, [calculateThirtyDayAvg]);

  // Set default cage timeframes when master data loads
  useEffect(() => {
    if (masterData.length > 0) {
      const defaults: Record<CageKey, Timeframe> = {} as Record<CageKey, Timeframe>;
      masterData.forEach((item: any) => {
        const cageKey = KANDANG_TO_CAGE[item.kandang];
        if (cageKey && !defaults[cageKey]) {
          defaults[cageKey] = "daily";
        }
      });
      setCageTimeframes(defaults);
    }
  }, [masterData]);

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregate data by timeframe
  const aggregatedData = useMemo(() => {
    if (!productionData.length) return [];

    const getRange = (date: Date) => {
      switch (timeframe) {
        case "daily":
          return { start: startOfDay(date), end: endOfDay(date) };
        case "weekly":
          return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
        case "monthly":
          return { start: startOfMonth(date), end: endOfMonth(date) };
        case "annually":
          return { start: startOfYear(date), end: endOfYear(date) };
      }
    };

    const getIntervals = () => {
      const dates = productionData.map((p) => new Date(p.date)).filter((d) => !isNaN(d.getTime()));
      if (!dates.length) return [];
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      switch (timeframe) {
        case "daily":
          return eachDayOfInterval({ start: minDate, end: maxDate });
        case "weekly":
          return eachWeekOfInterval({ start: minDate, end: maxDate, weekStartsOn: 1 });
        case "monthly":
          return eachMonthOfInterval({ start: minDate, end: maxDate });
        case "annually":
          return eachYearOfInterval({ start: minDate, end: maxDate });
      }
    };

    const intervals = getIntervals();
    if (!intervals.length) return [];

    return intervals.map((intervalStart) => {
      const { start, end } = getRange(intervalStart);
      const entry: any = { date: intervalStart };

      // Aggregate each cage
      (Object.keys(CAGE_CONFIG) as CageKey[]).forEach((cageKey) => {
        const kgKey = `${cageKey}Kg` as keyof typeof productionData[0];
        const telurKey = `${cageKey}JmlTelur` as keyof typeof productionData[0];

        const relevantEntries = productionData.filter((p) => {
          const d = new Date(p.date);
          return isWithinInterval(d, { start, end });
        });

        let totalKg = 0;
        let totalTelur = 0;
        relevantEntries.forEach((p) => {
          totalKg += Number(p[kgKey]) || 0;
          totalTelur += Number(p[telurKey]) || 0;
        });

        entry[`${cageKey}_kg`] = totalKg;
        entry[`${cageKey}_telur`] = totalTelur;
      });

      return entry;
    });
  }, [productionData, timeframe]);

  // Get chart data for a specific cage
  const getCageChartData = (cageKey: CageKey, cageTimeframe: Timeframe) => {
    const cageTimeframeUse = cageTimeframes[cageKey] || cageTimeframe;
    const metricKey = `${cageKey}_${metric}`;
    return aggregatedData.map((entry) => {
      let name: string;
      switch (cageTimeframeUse) {
        case "daily":
          name = format(entry.date, "dd MMM", { locale: id });
          break;
        case "weekly":
          name = format(entry.date, "dd MMM", { locale: id });
          break;
        case "monthly":
          name = format(entry.date, "MMMM yyyy", { locale: id });
          break;
        case "annually":
          name = format(entry.date, "yyyy");
          break;
      }
      return { name, value: entry[metricKey] };
    });
  };

  const toggleCard = (cageKey: CageKey) => {
    setExpandedCard((prev) => (prev === cageKey ? null : cageKey));
  };

  const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
    { value: "daily", label: "Harian" },
    { value: "weekly", label: "Mingguan" },
    { value: "monthly", label: "Bulanan" },
    { value: "annually", label: "Tahunan" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-slate-200 rounded-3xl" />
          <div className="h-32 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
      {/* Global Dropdowns */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-6 top-4 z-10">
        <div className="grid grid-cols-2 gap-3">
          {/* Timeframe Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">
              Waktu
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="w-full px-3 py-2.5 bg-slate-900 text-white rounded-xl font-black text-sm appearance-none cursor-pointer"
            >
              {TIMEFRAME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Dropdown */}
          <div>
            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">
              Data
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as "kg" | "telur")}
              className="w-full px-3 py-2.5 bg-slate-900 text-white rounded-xl font-black text-sm appearance-none cursor-pointer"
            >
              <option value="kg">Kilogram (Kg)</option>
              <option value="telur">Jumlah Telur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cage Cards */}
      {!loading && masterData.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-amber-800 font-medium text-sm">
            Silakan login untuk melihat data.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {masterData.map((item: any, idx: number) => {
          const cageKey = KANDANG_TO_CAGE[item.kandang];
          const cageConfig = cageKey ? CAGE_CONFIG[cageKey] : null;
          const isExpanded = expandedCard === cageKey;
          const cageTimeframe = cageTimeframes[cageKey] || timeframe;
          const chartData = cageKey ? getCageChartData(cageKey, timeframe) : [];

          if (!cageKey || !cageConfig) return null;

          return (
            <div
              key={item.kandang}
              className={`bg-white rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 overflow-hidden ${
                isExpanded ? "border-blue-500 ring-4 ring-blue-50" : "hover:border-slate-300"
              }`}
            >
              {/* Card Header - Clickable */}
              <button
                onClick={() => toggleCard(cageKey)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl"
                      style={{ backgroundColor: cageConfig.color, color: "white" }}
                    >
                      {item.kandang}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-lg">{cageConfig.label}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.jmlAyam.toLocaleString()} ayam • {thirtyDayAvg[cageKey]?.toFixed(1) || 0} kg/hari
                      </p>
                    </div>
                  </div>
                  {/* Chevron */}
                  <svg
                    className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Collapsed Stats */}
                {!isExpanded && (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Ayam</p>
                      <p className="text-lg font-black text-slate-900">{item.jmlAyam.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Ember</p>
                      <p className="text-lg font-black text-slate-900">{item.jmlEmber.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Pakan</p>
                      <p className="text-lg font-black text-slate-900">{item.jmlPakan.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </button>

              {/* Expanded Graph */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 animate-fadeIn">
                  {/* Per-cage Timeframe Dropdown */}
                  <div className="mt-4 flex justify-end">
                    <select
                      value={cageTimeframes[cageKey] || "daily"}
                      onChange={(e) => setCageTimeframes((prev) => ({ ...prev, [cageKey]: e.target.value as Timeframe }))}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-black text-xs appearance-none cursor-pointer"
                    >
                      {TIMEFRAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="h-[250px]">
                    {!chartData.length ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm italic font-medium">
                        Tidak ada data tersedia.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                            dy={10}
                            interval={cageTimeframe === "daily" ? 6 : cageTimeframe === "weekly" ? 4 : 0}
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
                            itemStyle={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}
                            formatter={(value) => [Number(value || 0).toLocaleString(), ""]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name={cageConfig.label}
                            stroke={cageConfig.color}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Expanded Stats */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Ayam</p>
                      <p className="text-xl font-black text-slate-900">{item.jmlAyam.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Kg/Hari</p>
                      <p className="text-xl font-black text-slate-900">{thirtyDayAvg[cageKey]?.toFixed(1) || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Ember</p>
                      <p className="text-xl font-black text-slate-900">{item.jmlEmber.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Pakan</p>
                      <p className="text-xl font-black text-slate-900">{item.jmlPakan.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && masterData.length > 0 && masterData.every((item) => !KANDANG_TO_CAGE[item.kandang]) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-amber-800 font-medium text-sm">
              Data kandang tidak cocok dengan konfigurasi. Cek database: {masterData.map((m) => m.kandang).join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}