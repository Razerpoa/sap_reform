"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getWIBDateString } from "@/lib/date-utils";
import { ArrowLeft, Save, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import Link from "next/link";
import DateSelector from "@/components/DateSelector";

type SeatKey = `${number}-${number}`; // "baris-kolom" format, e.g. "3-7"
type SeatStatus = "PRODUCING" | "NOT_PRODUCING" | "EMPTY";

export default function CageCheckPage() {
  const params = useParams();
  const kandang = decodeURIComponent(params.kandang as string);

  const [selectedDate, setSelectedDate] = useState(getWIBDateString());
  const [cageMaster, setCageMaster] = useState<any>(null);
  const [checks, setChecks] = useState<Record<SeatKey, SeatStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalChecks, setOriginalChecks] = useState("");
  const [localJmlAyam, setLocalJmlAyam] = useState(0);

  // All records loaded from DB (sparse — only explicitly saved positions)
  const [dbRecords, setDbRecords] = useState<any[]>([]);

  const SINGLE_KOLOM_COUNT = 8; // single rows: 1-8
  const DOUBLE_KOLOM_COUNT = 6; // double rows: 2-7

  const totalPositions = cageMaster?.jmlKandang || cageMaster?.jmlAyam || 0;
  const totChickens = localJmlAyam || totalPositions;

  /**
   * 6+2 row pattern: rows 1-6 single (8 cols), 7-8 double (6 cols), repeat.
   * Block = 8 rows (6×8 + 2×6 = 60 cells).
   */
  function isDoubleRow(baris: number): boolean {
    return (baris - 1) % 8 >= 6;
  }

  function colsInRow(baris: number): number {
    return isDoubleRow(baris) ? DOUBLE_KOLOM_COUNT : SINGLE_KOLOM_COUNT;
  }

  function startKolom(baris: number): number {
    return isDoubleRow(baris) ? 2 : 1;
  }

  function computeTotalBaris(totalKandang: number): number {
    const BLOCK_ROWS = 8;
    const BLOCK_CAPACITY = 60; // 6×8 + 2×6
    const fullBlocks = Math.floor(totalKandang / BLOCK_CAPACITY);
    const remainder = totalKandang % BLOCK_CAPACITY;
    if (remainder === 0) return fullBlocks * BLOCK_ROWS;
    // First 6 rows of a block are single (8 cols each = 48)
    if (remainder <= 48) return fullBlocks * BLOCK_ROWS + Math.ceil(remainder / SINGLE_KOLOM_COUNT);
    // After 6 single rows, remaining cells go into double rows (6 cols each)
    return fullBlocks * BLOCK_ROWS + 6 + Math.ceil((remainder - 48) / DOUBLE_KOLOM_COUNT);
  }

  const totalBaris = computeTotalBaris(totalPositions);
  const producingCount = Object.entries(checks).reduce((sum, [key, status]) => {
    if (status !== "PRODUCING") return sum;
    const baris = parseInt(key.split("-")[0]);
    return sum + (isDoubleRow(baris) ? 2 : 1);
  }, 0);

  // Refs for streak-day calculation (avoids stale closure in render)
  const dbRecordsRef = useRef(dbRecords);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { dbRecordsRef.current = dbRecords; }, [dbRecords]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [selectedDate, kandang]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const masterRes = await fetch(
        `/api/master?kandang=${encodeURIComponent(kandang)}&_t=${Date.now()}`
      );
      const masterData = await masterRes.json();
      setCageMaster(masterData);

      if (masterData?.id && (masterData?.jmlKandang > 0 || masterData?.jmlAyam > 0)) {
        const localTotalKandang = masterData.jmlKandang || masterData.jmlAyam;
        const localTotalBaris = computeTotalBaris(localTotalKandang);

        // Fetch records cumulatively: state as of selectedDate
        const checksRes = await fetch(
          `/api/cage-check?date=${selectedDate}&cageMasterId=${masterData.id}&_t=${Date.now()}`
        );
        const recordsData = await checksRes.json();
        setDbRecords(recordsData);

        // Build lookup: baris-kolom → status from DB records
        // (records are already deduplicated — latest per position)
        const recordMap: Record<string, SeatStatus> = {};
        for (const r of recordsData) {
          recordMap[seatKey(r.baris, r.kolom)] = r.status;
        }

        // Initialize: use DB record if saved, otherwise PRODUCING (default)
        // Positions beyond the chicken budget are EMPTY (cumulative weighted count)
        const checkMap: Record<SeatKey, SeatStatus> = {};
        let pos = 0;
        let cumulativeChickens = 0;
        const jmlAyamVal = masterData.jmlAyam;
        for (let baris = 1; baris <= localTotalBaris; baris++) {
          const start = startKolom(baris);
          const end = start + colsInRow(baris) - 1;
          for (let kolom = start; kolom <= end; kolom++) {
            if (pos >= localTotalKandang) break;
            pos++;
            const key = seatKey(baris, kolom);
            const weight = isDoubleRow(baris) ? 2 : 1;
            const hasChicken = jmlAyamVal === undefined || (cumulativeChickens + weight <= jmlAyamVal);
            if (hasChicken) cumulativeChickens += weight;
            checkMap[key] = recordMap[key] ?? (hasChicken ? "PRODUCING" : "EMPTY");
          }
        }

        setChecks(checkMap);
        setLocalJmlAyam(cumulativeChickens);
        setOriginalChecks(JSON.stringify(checkMap));
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  function seatKey(baris: number, kolom: number): SeatKey {
    return `${baris}-${kolom}`;
  }

  /**
   * Compute calendar days since the NOT_PRODUCING streak started.
   * Uses the oldest NOT_PRODUCING record for this position in the DB.
   * Returns number of days since streak start (0 = started today).
   */
  function getDaysSinceStreak(baris: number, kolom: number): number {
    const data = dbRecordsRef.current;
    const seatRecords = data
      .filter((r: any) => r.baris === baris && r.kolom === kolom && r.status === "NOT_PRODUCING")
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (seatRecords.length === 0) return -1;

    const streakStart = new Date(seatRecords[0].date);
    streakStart.setHours(0, 0, 0, 0);

    const refDate = new Date(selectedDateRef.current);
    refDate.setHours(0, 0, 0, 0);

    return Math.floor(
      (refDate.getTime() - streakStart.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Long-press timer refs
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTargetRef = useRef<{ baris: number; kolom: number } | null>(null);

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressTargetRef.current = null;
  }

  function handlePointerDown(baris: number, kolom: number) {
    const key = seatKey(baris, kolom);
    if (!(key in checks)) return; // not occupied

    clearPressTimer();
    pressTargetRef.current = { baris, kolom };

    pressTimerRef.current = setTimeout(() => {
      // Long press → set to EMPTY (no-op if already EMPTY)
      pressTimerRef.current = null;
      if (pressTargetRef.current) {
        const { baris, kolom } = pressTargetRef.current;
        const k = seatKey(baris, kolom);
        const weight = isDoubleRow(baris) ? 2 : 1;
        setChecks((prev) => {
          if (prev[k] === "EMPTY") return prev; // no-op
          setLocalJmlAyam((prevAyam) => prevAyam - weight);
          return { ...prev, [k]: "EMPTY" };
        });
        pressTargetRef.current = null;
      }
    }, 400);
  }

  function handlePointerUp(baris: number, kolom: number) {
    const key = seatKey(baris, kolom);
    if (!(key in checks)) return;

    if (pressTimerRef.current !== null) {
      // Quick release → toggle green/blue
      clearPressTimer();
      setChecks((prev) => {
        const current = prev[key];
        if (current === "EMPTY") {
          // EMPTY → PRODUCING: increment localJmlAyam by this position's weight
          const w = isDoubleRow(baris) ? 2 : 1;
          setLocalJmlAyam((prevAyam) => prevAyam + w);
          return { ...prev, [key]: "PRODUCING" };
        }
        const next = current === "PRODUCING" ? "NOT_PRODUCING" : "PRODUCING";
        return { ...prev, [key]: next };
      });
    }
    // If pressTimerRef is null, the long press already fired — do nothing
  }

  function handlePointerCancel() {
    clearPressTimer();
  }

  function getSeatColor(status: SeatStatus, baris: number, kolom: number): string {
    if (status === "EMPTY") return "bg-gray-900 text-white";
    if (status === "PRODUCING") return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
    const days = getDaysSinceStreak(baris, kolom);
    // days: 0 = first day not producing, 1 = second day, etc.
    if (days >= 3) return "bg-red-500 text-white";
    if (days === 2) return "bg-orange-500 text-white";
    if (days === 1) return "bg-amber-400 text-white";
    return "bg-blue-500 text-white";
  }

  function renderSeatIcon(status: SeatStatus) {
    if (status === "EMPTY") return <X className="w-3.5 h-3.5" />;
    if (status === "PRODUCING") return <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />;
    // NOT_PRODUCING: color only, no day count text
    return null;
  }

  const hasChanges = JSON.stringify(checks) !== originalChecks;

  /** Only send the positions that actually changed (diff-based save) */
  function computeChangedPositions(): { baris: number; kolom: number; status: SeatStatus }[] {
    const original: Record<SeatKey, SeatStatus> = JSON.parse(originalChecks);
    const changes: { baris: number; kolom: number; status: SeatStatus }[] = [];
    for (const key of Object.keys(checks)) {
      const sk = key as SeatKey;
      if (checks[sk] !== original[sk]) {
        const [b, k] = key.split("-");
        changes.push({ baris: parseInt(b), kolom: parseInt(k), status: checks[sk] });
      }
    }
    return changes;
  }

  async function handleSave() {
    if (!cageMaster?.id || !hasChanges) return;

    const changedPositions = computeChangedPositions();
    if (changedPositions.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cage-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          cageMasterId: cageMaster.id,
          checks: changedPositions,
          cageMasterJmlAyam: localJmlAyam,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setOriginalChecks(JSON.stringify(checks));

        // Refetch to get updated records with new dates
        await fetchData();

        setTimeout(() => setSuccess(false), 2000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Gagal menyimpan");
      }
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function renderTrainSeats() {
    if (!cageMaster || totalPositions === 0) {
      return (
        <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          Kandang ini tidak memiliki kandang. Atur jumlah kandang di Data Master.
        </div>
      );
    }

    const leftSingleCols = [1, 2, 3, 4];
    const rightSingleCols = [5, 6, 7, 8];
    const leftDoubleCols = [2, 3, 4];
    const rightDoubleCols = [5, 6, 7];

    return (
      <div className="space-y-1">
        {/* Column headers — stacked reference rows */}
        {/* Single reference */}
        <div className="flex items-center gap-1 md:gap-2 mb-1">
          <div className="w-8 shrink-0" />
          <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
            {leftSingleCols.map((k) => (
              <div key={`hls-${k}`} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {k}
              </div>
            ))}
          </div>
          <div className="w-4 md:w-8 shrink-0" />
          <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
            {rightSingleCols.map((k) => (
              <div key={`hrs-${k}`} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {k}
              </div>
            ))}
          </div>
        </div>
        {/* Double reference */}
        <div className="flex items-center gap-1 md:gap-2 mb-2">
          <div className="w-8 shrink-0 text-center">
            <span className="text-[7px] font-black text-amber-500">2x</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1 md:gap-2">
            {leftDoubleCols.map((k) => (
              <div key={`hld-${k}`} className="text-center text-[10px] font-black text-amber-500/60 uppercase tracking-wider">
                {k}
              </div>
            ))}
          </div>
          <div className="w-4 md:w-8 shrink-0" />
          <div className="flex-1 grid grid-cols-3 gap-1 md:gap-2">
            {rightDoubleCols.map((k) => (
              <div key={`hrd-${k}`} className="text-center text-[10px] font-black text-amber-500/60 uppercase tracking-wider">
                {k}
              </div>
            ))}
          </div>
        </div>

        {/* Side labels */}
        <div className="flex items-center gap-1 md:gap-2 mb-2">
          <div className="w-8 shrink-0" />
          <div className="flex-1 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">Kiri</div>
          <div className="w-4 md:w-8 shrink-0" />
          <div className="flex-1 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">Kanan</div>
        </div>

        {/* Seat rows */}
        {Array.from({ length: totalBaris }, (_, i) => {
          const baris = i + 1;
          const double = isDoubleRow(baris);
          const leftCols = double ? leftDoubleCols : leftSingleCols;
          const rightCols = double ? rightDoubleCols : rightSingleCols;
          const start = startKolom(baris);
          const end = start + colsInRow(baris) - 1;

          const occupiedKoloms: number[] = [];
          for (let k = start; k <= end; k++) {
            if (seatKey(baris, k) in checks) occupiedKoloms.push(k);
          }
          if (occupiedKoloms.length === 0) return null;

          return (
            <div key={baris} className="flex items-center gap-1 md:gap-2">
              {/* Row number + 2x indicator */}
              <div className="w-8 shrink-0 text-center leading-none">
                <span className="text-[10px] font-black text-slate-300">{baris}</span>
                {double && (
                  <span className="block text-[7px] font-black text-amber-500 leading-tight -mt-px">2x</span>
                )}
              </div>

              {/* Left side */}
              <div className={`flex-1 grid gap-1 md:gap-2 ${double ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {leftCols.map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`l-${kolom}`}
                      onPointerDown={() => handlePointerDown(baris, kolom)}
                      onPointerUp={() => handlePointerUp(baris, kolom)}
                      onPointerLeave={handlePointerCancel}
                      onPointerCancel={handlePointerCancel}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}${double ? ' (2 ayam)' : ''}` : undefined}
                      className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                        occupied
                          ? getSeatColor(checks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && (
                        <>
                          {renderSeatIcon(checks[key])}
                          {double && (
                            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-white/70 leading-none">
                              2
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Aisle */}
              <div className="w-4 md:w-8 shrink-0 flex justify-center">
                <div className="w-px md:w-0.5 h-7 md:h-9 bg-slate-100 rounded-full" />
              </div>

              {/* Right side */}
              <div className={`flex-1 grid gap-1 md:gap-2 ${double ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {rightCols.map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`r-${kolom}`}
                      onPointerDown={() => handlePointerDown(baris, kolom)}
                      onPointerUp={() => handlePointerUp(baris, kolom)}
                      onPointerLeave={handlePointerCancel}
                      onPointerCancel={handlePointerCancel}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}${double ? ' (2 ayam)' : ''}` : undefined}
                      className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                        occupied
                          ? getSeatColor(checks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && (
                        <>
                          {renderSeatIcon(checks[key])}
                          {double && (
                            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-white/70 leading-none">
                              2
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 pb-40 sm:pb-32">
      {/* Back link */}
      <Link
        href="/entry?tab=master"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium text-sm mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kandang {kandang}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Cek Status Produksi
            {cageMaster && (
              <span className="text-slate-400">
                {" "}&bull; {totalBaris} baris &bull; {cageMaster.jmlKandang || totalPositions} kandang &bull; {cageMaster.jmlAyam ?? 0} ayam
              </span>
            )}
          </p>
        </div>
        <DateSelector
          value={selectedDate}
          onChange={(d) => setSelectedDate(d || getWIBDateString())}
        />
      </div>

      {/* Summary Card */}
      {totalPositions > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Produksi ({selectedDate})
              </p>
              <p className="text-2xl md:text-3xl font-black mt-1">
                {producingCount}
                <span className="text-sm text-slate-400 font-medium"> / {totChickens}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Persentase
              </p>
              <p className="text-2xl md:text-3xl font-black mt-1">
                {totChickens > 0 ? Math.round((producingCount / totChickens) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${totChickens > 0 ? (producingCount / totChickens) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Data tersimpan
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Train Seat Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
            {renderTrainSeats()}

            {/* Legend */}
            {totalPositions > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" /> Produksi
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-blue-500" /> 1 Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-amber-400" /> 2 Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-orange-500" /> 3 Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-red-500" /> 4+ Hari
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-gray-900" /> Kosong
                </div>
              </div>
            )}
          </div>

          {/* Sticky Save Button */}
          {hasChanges && (
            <div className="fixed bottom-24 sm:bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-[60]">
              <div className="mx-auto max-w-2xl">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
