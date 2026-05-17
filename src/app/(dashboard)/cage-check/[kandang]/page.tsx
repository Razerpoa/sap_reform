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
  const [singleChecks, setSingleChecks] = useState<Record<SeatKey, SeatStatus>>({});
  const [doubleSeats, setDoubleSeats] = useState<Record<string, { left: SeatStatus; right: SeatStatus }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSingleChecks, setOriginalSingleChecks] = useState("");
  const [originalDoubleSeats, setOriginalDoubleSeats] = useState("");
  const [localJmlAyam, setLocalJmlAyam] = useState(0);
  const [popupTarget, setPopupTarget] = useState<{ baris: number; kolom: number; rect: DOMRect } | null>(null);

  // All records loaded from DB (sparse — only explicitly saved positions)
  const [dbRecords, setDbRecords] = useState<any[]>([]);

  const SINGLE_KOLOM_COUNT = 8; // single rows: 1-8
  const DOUBLE_KOLOM_COUNT = 8; // double rows: 1-8 (cols 1,8 single; cols 2-7 double)

  const totalPositions = cageMaster?.jmlKandang || cageMaster?.jmlAyam || 0;
  const totChickens = localJmlAyam || totalPositions;

  /**
   * 6+2 row pattern: rows 1-6 single (8 cols), 7-8 double (6 cols), repeat.
   * Block = 8 rows (6×8 + 2×6 = 60 cells).
   * When doubleRows=false, all rows are single (8 cols each).
   */
  function isDoubleRow(baris: number, doubleRows?: boolean): boolean {
    const enabled = doubleRows !== undefined ? doubleRows : cageMaster?.doubleRows;
    if (!enabled) return false;
    return (baris - 1) % 8 >= 6;
  }

  /** In a double row, only columns 2-7 are double seats; 1 and 8 are single seats. */
  function isDoubleKolom(baris: number, kolom: number, doubleRows?: boolean): boolean {
    return isDoubleRow(baris, doubleRows) && kolom >= 2 && kolom <= 7;
  }

  function computeTotalBaris(totalKandang: number, doubleRows?: boolean): number {
    const enabled = doubleRows !== undefined ? doubleRows : cageMaster?.doubleRows;
    if (!enabled) {
      return Math.ceil(totalKandang / SINGLE_KOLOM_COUNT);
    }
    const BLOCK_ROWS = 8;
    const BLOCK_CAPACITY = 64; // 6×8 + 2×8
    const fullBlocks = Math.floor(totalKandang / BLOCK_CAPACITY);
    const remainder = totalKandang % BLOCK_CAPACITY;
    if (remainder === 0) return fullBlocks * BLOCK_ROWS;
    // First 6 rows of a block are single (8 cols each = 48)
    if (remainder <= 48) return fullBlocks * BLOCK_ROWS + Math.ceil(remainder / SINGLE_KOLOM_COUNT);
    // After 6 single rows, remaining cells go into double rows (8 cols each: cols 1,8 single; 2-7 double)
    return fullBlocks * BLOCK_ROWS + 6 + Math.ceil((remainder - 48) / DOUBLE_KOLOM_COUNT);
  }

  const totalBaris = computeTotalBaris(totalPositions);

  const producingCount = (() => {
    let count = 0;
    // Count single seat producing
    for (const status of Object.values(singleChecks)) {
      if (status === "PRODUCING") count++;
    }
    // Count double sub-position producing (left + right)
    for (const seat of Object.values(doubleSeats)) {
      if (seat.left === "PRODUCING") count++;
      if (seat.right === "PRODUCING") count++;
    }
    return count;
  })();

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
      const useDoubleRows = masterData.doubleRows !== false;
      setCageMaster(masterData);

      if (masterData?.id && (masterData?.jmlKandang > 0 || masterData?.jmlAyam > 0)) {
        const localTotalKandang = masterData.jmlKandang || masterData.jmlAyam;
        const localTotalBaris = computeTotalBaris(localTotalKandang, useDoubleRows);

        // Fetch records cumulatively: state as of selectedDate
        const checksRes = await fetch(
          `/api/cage-check?date=${selectedDate}&cageMasterId=${masterData.id}&_t=${Date.now()}`
        );
        const recordsData = await checksRes.json();
        setDbRecords(recordsData);

        // Separate records by subPos
        const singleRecordMap: Record<string, SeatStatus> = {};
        const doubleRecordMap: Record<string, { left: SeatStatus; right: SeatStatus }> = {};
        for (const r of recordsData) {
          const key = seatKey(r.baris, r.kolom);
          if (r.subPos === 0) {
            singleRecordMap[key] = r.status;
          } else if (r.subPos === 1) {
            if (!doubleRecordMap[key]) doubleRecordMap[key] = { left: "PRODUCING", right: "PRODUCING" };
            doubleRecordMap[key].left = r.status;
          } else if (r.subPos === 2) {
            if (!doubleRecordMap[key]) doubleRecordMap[key] = { left: "PRODUCING", right: "PRODUCING" };
            doubleRecordMap[key].right = r.status;
          }
        }

        // Initialize: use DB record if saved, otherwise PRODUCING (default)
        // Positions beyond the chicken budget are EMPTY (cumulative weighted count)
        const singleMap: Record<SeatKey, SeatStatus> = {};
        const doubleMap: Record<string, { left: SeatStatus; right: SeatStatus }> = {};
        let pos = 0;
        let cumulativeChickens = 0;
        const jmlAyamVal = masterData.jmlAyam;
        for (let baris = 1; baris <= localTotalBaris; baris++) {
          for (let kolom = 1; kolom <= 8; kolom++) {
            if (pos >= localTotalKandang) break;
            pos++;
            const isDouble = isDoubleKolom(baris, kolom, useDoubleRows);
            const weight = isDouble ? 2 : 1;
            const hasChicken = jmlAyamVal === undefined || (cumulativeChickens + weight <= jmlAyamVal);
            if (hasChicken) cumulativeChickens += weight;

            if (isDouble) {
              const key = seatKey(baris, kolom);
              const saved = doubleRecordMap[key];
              doubleMap[key] = saved ?? { left: "PRODUCING", right: "PRODUCING" };
              if (!hasChicken) {
                doubleMap[key] = { left: "EMPTY", right: "EMPTY" };
              }
            } else {
              const key = seatKey(baris, kolom);
              singleMap[key] = singleRecordMap[key] ?? (hasChicken ? "PRODUCING" : "EMPTY");
            }
          }
        }

        setSingleChecks(singleMap);
        setDoubleSeats(doubleMap);
        setLocalJmlAyam(cumulativeChickens);
        setOriginalSingleChecks(JSON.stringify(singleMap));
        setOriginalDoubleSeats(JSON.stringify(doubleMap));
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
  function getDaysSinceStreak(baris: number, kolom: number, subPos: number = 0): number {
    const data = dbRecordsRef.current;
    const seatRecords = data
      .filter((r: any) => r.baris === baris && r.kolom === kolom && r.subPos === subPos && r.status === "NOT_PRODUCING")
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

  // Clear popup timers when popup closes (stale closure prevention)
  useEffect(() => {
    if (!popupTarget) clearPopupPressTimer();
  }, [popupTarget]);

  // Long-press timer refs (single seats)
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
    if (!(key in singleChecks)) return; // not occupied

    clearPressTimer();
    pressTargetRef.current = { baris, kolom };

    pressTimerRef.current = setTimeout(() => {
      // Long press → set to EMPTY (no-op if already EMPTY)
      pressTimerRef.current = null;
      if (pressTargetRef.current) {
        const { baris, kolom } = pressTargetRef.current;
        const k = seatKey(baris, kolom);
        setSingleChecks((prev) => {
          if (prev[k] === "EMPTY") return prev;
          setLocalJmlAyam((prevAyam) => prevAyam - 1);
          return { ...prev, [k]: "EMPTY" };
        });
        pressTargetRef.current = null;
      }
    }, 400);
  }

  function handlePointerUp(baris: number, kolom: number) {
    const key = seatKey(baris, kolom);
    if (!(key in singleChecks)) return;

    if (pressTimerRef.current !== null) {
      // Quick release → toggle green/blue
      clearPressTimer();
      setSingleChecks((prev) => {
        const current = prev[key];
        if (current === "EMPTY") {
          setLocalJmlAyam((prevAyam) => prevAyam + 1);
          return { ...prev, [key]: "PRODUCING" };
        }
        const next = current === "PRODUCING" ? "NOT_PRODUCING" : "PRODUCING";
        return { ...prev, [key]: next };
      });
    }
  }

  function handlePointerCancel() {
    clearPressTimer();
  }

  // Popup sub-toggle timer refs
  const popupPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupPressTargetRef = useRef<{ side: "left" | "right" } | null>(null);

  function clearPopupPressTimer() {
    if (popupPressTimerRef.current !== null) {
      clearTimeout(popupPressTimerRef.current);
      popupPressTimerRef.current = null;
    }
    popupPressTargetRef.current = null;
  }

  function handlePopupPointerDown(side: "left" | "right") {
    if (!popupTarget) return;
    clearPopupPressTimer();
    popupPressTargetRef.current = { side };

    popupPressTimerRef.current = setTimeout(() => {
      popupPressTimerRef.current = null;
      if (popupPressTargetRef.current && popupTarget) {
        const key = seatKey(popupTarget.baris, popupTarget.kolom);
        setDoubleSeats((prev) => {
          const current = prev[key]?.[side];
          if (current === "EMPTY") return prev;
          setLocalJmlAyam((prevAyam) => prevAyam - 1);
          return {
            ...prev,
            [key]: { ...prev[key], [side]: "EMPTY" },
          };
        });
        popupPressTargetRef.current = null;
      }
    }, 400);
  }

  function handlePopupPointerUp(side: "left" | "right") {
    if (!popupTarget) return;
    const key = seatKey(popupTarget.baris, popupTarget.kolom);
    if (!(key in doubleSeats)) return;

    if (popupPressTimerRef.current !== null) {
      clearPopupPressTimer();
      setDoubleSeats((prev) => {
        const current = prev[key]?.[side];
        if (current === "EMPTY") {
          setLocalJmlAyam((prevAyam) => prevAyam + 1);
          return {
            ...prev,
            [key]: { ...prev[key], [side]: "PRODUCING" },
          };
        }
        const next = current === "PRODUCING" ? "NOT_PRODUCING" : "PRODUCING";
        return {
          ...prev,
          [key]: { ...prev[key], [side]: next },
        };
      });
    }
  }

  function handlePopupPointerCancel() {
    clearPopupPressTimer();
  }

  function getSeatColor(status: SeatStatus, baris: number, kolom: number, subPos: number = 0): string {
    if (status === "EMPTY") return "bg-gray-900 text-white";
    if (status === "PRODUCING") return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
    const days = getDaysSinceStreak(baris, kolom, subPos);
    if (days >= 3) return "bg-red-500 text-white";
    if (days === 2) return "bg-orange-500 text-white";
    if (days === 1) return "bg-amber-400 text-white";
    return "bg-blue-500 text-white";
  }

  function renderSeatIcon(_status: SeatStatus) {
    return null;
  }

  const hasChanges = (() => {
    if (JSON.stringify(singleChecks) !== originalSingleChecks) return true;
    if (JSON.stringify(doubleSeats) !== originalDoubleSeats) return true;
    return false;
  })();

  /** Only send the positions that actually changed (diff-based save) */
  function computeChangedPositions(): { baris: number; kolom: number; subPos: number; status: SeatStatus }[] {
    const changes: { baris: number; kolom: number; subPos: number; status: SeatStatus }[] = [];

    // Diff single checks (subPos=0)
    const originalSingle: Record<SeatKey, SeatStatus> = originalSingleChecks ? JSON.parse(originalSingleChecks) : {};
    for (const key of Object.keys(singleChecks)) {
      const sk = key as SeatKey;
      if (singleChecks[sk] !== originalSingle[sk]) {
        const [b, k] = key.split("-");
        changes.push({ baris: parseInt(b), kolom: parseInt(k), subPos: 0, status: singleChecks[sk] });
      }
    }

    // Diff double seats (subPos=1 for left, subPos=2 for right)
    const originalDouble: Record<string, { left: SeatStatus; right: SeatStatus }> = originalDoubleSeats ? JSON.parse(originalDoubleSeats) : {};
    for (const key of Object.keys(doubleSeats)) {
      const current = doubleSeats[key];
      const original = originalDouble[key];
      const [bStr, kStr] = key.split("-");
      const baris = parseInt(bStr), kolom = parseInt(kStr);
      if (!original || current.left !== original.left) {
        changes.push({ baris, kolom, subPos: 1, status: current.left });
      }
      if (!original || current.right !== original.right) {
        changes.push({ baris, kolom, subPos: 2, status: current.right });
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
        setOriginalSingleChecks(JSON.stringify(singleChecks));
        setOriginalDoubleSeats(JSON.stringify(doubleSeats));

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

  function renderDoubleSeatButton(baris: number, kolom: number, key: string) {
    const seat = doubleSeats[key];
    if (!seat) {
      // Beyond-capacity slot: render as a clickable seat-like button
      return (
        <button
          key={`d-${kolom}`}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setPopupTarget({ baris, kolom, rect });
          }}
          className="rounded-lg md:rounded-xl flex items-center justify-center h-9 md:h-11 bg-emerald-500/20 border border-dashed border-emerald-300 transition-all duration-150 select-none opacity-40"
        />
      );
    }
    return (
      <button
        key={`d-${kolom}`}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setPopupTarget({ baris, kolom, rect });
        }}
        className="relative rounded-lg md:rounded-xl flex items-center justify-center h-9 md:h-11 overflow-hidden transition-all duration-150 select-none"
      >
        {/* Left half */}
        <div className={`flex-1 h-full flex items-center justify-center ${getSeatColor(seat.left, baris, kolom, 1)}`} />
        {/* Vertical divider */}
        <div className="w-px bg-white/50 shrink-0 h-full" />
        {/* Right half */}
        <div className={`flex-1 h-full flex items-center justify-center ${getSeatColor(seat.right, baris, kolom, 2)}`} />
      </button>
    );
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
    const leftDoubleCols = [1, 2, 3, 4];
    const rightDoubleCols = [5, 6, 7, 8];
    const hasDoubleRows = !!cageMaster?.doubleRows;

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

          const occupiedKoloms: number[] = [];
          const occupiedDoubleKoloms: number[] = [];
          for (let k = 1; k <= 8; k++) {
            if (isDoubleKolom(baris, k)) {
              if (seatKey(baris, k) in doubleSeats) occupiedDoubleKoloms.push(k);
            } else {
              if (seatKey(baris, k) in singleChecks) occupiedKoloms.push(k);
            }
          }
          if (occupiedDoubleKoloms.length === 0 && occupiedKoloms.length === 0) return null;

          return (
            <div key={baris} className="flex items-center gap-1 md:gap-2">
              {/* Row number */}
              <div className="w-8 shrink-0 text-center leading-none">
                <span className="text-[10px] font-black text-slate-300">{baris}</span>
              </div>

              {/* Left side */}
              <div className={`flex-1 grid gap-1 md:gap-2 grid-cols-4`}>
                {double ? (
                  leftCols.map((kolom) => {
                    const key = seatKey(baris, kolom);
                    if (kolom === 1) {
                      const occupied = occupiedKoloms.includes(kolom);
                      return (
                        <button
                          key={`l-${kolom}`}
                          onPointerDown={() => handlePointerDown(baris, kolom)}
                          onPointerUp={() => handlePointerUp(baris, kolom)}
                          onPointerLeave={handlePointerCancel}
                          onPointerCancel={handlePointerCancel}
                          title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                          className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                            occupied
                              ? getSeatColor(singleChecks[key], baris, kolom)
                              : "bg-slate-50 border border-dashed border-slate-200"
                          }`}
                        >
                          {occupied && renderSeatIcon(singleChecks[key])}
                        </button>
                      );
                    }
                    return renderDoubleSeatButton(baris, kolom, key);
                  })
                ) : (
                  leftCols.map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`l-${kolom}`}
                      onPointerDown={() => handlePointerDown(baris, kolom)}
                      onPointerUp={() => handlePointerUp(baris, kolom)}
                      onPointerLeave={handlePointerCancel}
                      onPointerCancel={handlePointerCancel}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                      className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                        occupied
                          ? getSeatColor(singleChecks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && renderSeatIcon(singleChecks[key])}
                    </button>
                  );
                }))}
              </div>

              {/* Aisle */}
              <div className="w-4 md:w-8 shrink-0 flex justify-center">
                <div className="w-px md:w-0.5 h-7 md:h-9 bg-slate-100 rounded-full" />
              </div>

              {/* Right side */}
              <div className="flex-1 grid gap-1 md:gap-2 grid-cols-4">
                {double ? (
                  rightCols.map((kolom) => {
                    const key = seatKey(baris, kolom);
                    if (kolom === 8) {
                      const occupied = occupiedKoloms.includes(kolom);
                      return (
                        <button
                          key={`r-${kolom}`}
                          onPointerDown={() => handlePointerDown(baris, kolom)}
                          onPointerUp={() => handlePointerUp(baris, kolom)}
                          onPointerLeave={handlePointerCancel}
                          onPointerCancel={handlePointerCancel}
                          title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                          className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                            occupied
                              ? getSeatColor(singleChecks[key], baris, kolom)
                              : "bg-slate-50 border border-dashed border-slate-200"
                          }`}
                        >
                          {occupied && renderSeatIcon(singleChecks[key])}
                        </button>
                      );
                    }
                    return renderDoubleSeatButton(baris, kolom, key);
                  })
                ) : (
                  rightCols.map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`r-${kolom}`}
                      onPointerDown={() => handlePointerDown(baris, kolom)}
                      onPointerUp={() => handlePointerUp(baris, kolom)}
                      onPointerLeave={handlePointerCancel}
                      onPointerCancel={handlePointerCancel}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                      className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
                        occupied
                          ? getSeatColor(singleChecks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && renderSeatIcon(singleChecks[key])}
                    </button>
                  );
                }))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPopup() {
    if (!popupTarget) return null;
    const { baris, kolom, rect } = popupTarget;
    const key = seatKey(baris, kolom);
    const seat = doubleSeats[key];
    if (!seat) return null;

    // Position popup above the seat button
    const popupTop = rect.top - 8; // 8px gap above
    const popupLeft = rect.left + rect.width / 2; // center horizontally over button

    return (
      <>
        {/* Backdrop covers entire screen to catch outside clicks */}
        <div
          className="fixed inset-0 z-[100]"
          onClick={() => setPopupTarget(null)}
        />
        {/* Popup card positioned above the button */}
        <div
          className="fixed z-[101]"
          style={{
            top: popupTop,
            left: popupLeft,
            transform: "translate(-50%, -100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[180px]">
            {/* Title */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2.5">
              B{baris} K{kolom}
            </p>

            {/* Sub-toggle buttons */}
            <div className="flex gap-2 mb-2.5">
              <SubToggleButton
                label="KIRI"
                status={seat.left}
                baris={baris}
                kolom={kolom}
                subPos={1}
                onPointerDown={() => handlePopupPointerDown("left")}
                onPointerUp={() => handlePopupPointerUp("left")}
                onPointerCancel={handlePopupPointerCancel}
                getSeatColor={getSeatColor}
              />
              <SubToggleButton
                label="KANAN"
                status={seat.right}
                baris={baris}
                kolom={kolom}
                subPos={2}
                onPointerDown={() => handlePopupPointerDown("right")}
                onPointerUp={() => handlePopupPointerUp("right")}
                onPointerCancel={handlePopupPointerCancel}
                getSeatColor={getSeatColor}
              />
            </div>

            {/* Bottom preview — non-interactive, mirrors current seat colors */}
            <div className="flex justify-center">
              <div className="w-16 h-7 rounded-md flex overflow-hidden border border-slate-100">
                <div className={`flex-1 ${getSeatColor(seat.left, baris, kolom, 1)}`} />
                <div className="w-px bg-white/50" />
                <div className={`flex-1 ${getSeatColor(seat.right, baris, kolom, 2)}`} />
              </div>
            </div>
          </div>

          {/* Arrow pointing down to the button */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
            style={{ bottom: "-6px" }}
          />
        </div>
      </>
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

      {/* Popup overlay */}
      {renderPopup()}
    </div>
  );
}

/* ========== Sub-toggle button component ========== */

function SubToggleButton({
  label,
  status,
  baris,
  kolom,
  subPos,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  getSeatColor,
}: {
  label: string;
  status: SeatStatus;
  baris: number;
  kolom: number;
  subPos: number;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  getSeatColor: (status: SeatStatus, baris: number, kolom: number, subPos: number) => string;
}) {
  return (
    <button
      className={`flex-1 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 select-none ${getSeatColor(status, baris, kolom, subPos)}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerCancel}
      onPointerCancel={onPointerCancel}
    >
      <span className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-none">
        {label}
      </span>
    </button>
  );
}
