"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getWIBDateString } from "@/lib/date-utils";
import { ArrowLeft, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import DateSelector from "@/components/DateSelector";
import SummaryCard from "@/components/cage-check/SummaryCard";
import TrainSeatsGrid from "@/components/cage-check/TrainSeatsGrid";
import Popup from "@/components/cage-check/Popup";
import {
  seatKey,
  computeTotalBaris,
  isDoubleKolom,
} from "@/components/cage-check/layout-utils";
import { getSeatColor } from "@/components/cage-check/streak-utils";
import { computeChangedPositions } from "@/components/cage-check/diff-utils";
import type {
  SeatKey,
  SeatStatus,
  DoubleSeat,
  CageMasterData,
  CageCheckRecord,
} from "@/components/cage-check/types";

export default function CageCheckPage() {
  const params = useParams();
  const kandang = decodeURIComponent(params.kandang as string);

  const [selectedDate, setSelectedDate] = useState(getWIBDateString());
  const [cageMaster, setCageMaster] = useState<CageMasterData | null>(null);
  const [singleChecks, setSingleChecks] = useState<Record<SeatKey, SeatStatus>>({});
  const [doubleSeats, setDoubleSeats] = useState<Record<string, DoubleSeat>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSingleChecks, setOriginalSingleChecks] = useState("");
  const [originalDoubleSeats, setOriginalDoubleSeats] = useState("");
  const [localJmlAyam, setLocalJmlAyam] = useState(0);
  const [popupTarget, setPopupTarget] = useState<{
    baris: number;
    kolom: number;
    rect: DOMRect;
  } | null>(null);
  const [dbRecords, setDbRecords] = useState<CageCheckRecord[]>([]);

  const totalPositions = cageMaster?.jmlKandang || cageMaster?.jmlAyam || 0;
  const doubleRowsEnabled = cageMaster?.doubleRows !== false;
  const totChickens = localJmlAyam || totalPositions;
  const totalBaris = computeTotalBaris(totalPositions, doubleRowsEnabled);

  // ---- Computed values ----
  const producingCount = (() => {
    let count = 0;
    for (const status of Object.values(singleChecks)) {
      if (status === "PRODUCING") count++;
    }
    for (const seat of Object.values(doubleSeats)) {
      if (seat.left === "PRODUCING") count++;
      if (seat.right === "PRODUCING") count++;
    }
    return count;
  })();

  const hasChanges = (() => {
    if (JSON.stringify(singleChecks) !== originalSingleChecks) return true;
    if (JSON.stringify(doubleSeats) !== originalDoubleSeats) return true;
    return false;
  })();

  // ---- Bound colour helper (receives fresh dbRecords + selectedDate on each render) ----
  function getSeatColorBound(
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos: number = 0,
  ) {
    return getSeatColor(status, baris, kolom, subPos, dbRecords, selectedDate);
  }

  // ---- Data fetching ----
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const masterRes = await fetch(
        `/api/master?kandang=${encodeURIComponent(kandang)}&_t=${Date.now()}`,
      );
      const masterData = await masterRes.json();
      const useDbDouble = masterData.doubleRows !== false;
      setCageMaster(masterData);

      if (
        masterData?.id &&
        (masterData?.jmlKandang > 0 || masterData?.jmlAyam > 0)
      ) {
        const localTotalKandang =
          masterData.jmlKandang || masterData.jmlAyam;
        const localTotalBaris = computeTotalBaris(
          localTotalKandang,
          useDbDouble,
        );

        const checksRes = await fetch(
          `/api/cage-check?date=${selectedDate}&cageMasterId=${masterData.id}&_t=${Date.now()}`,
        );
        const recordsData: CageCheckRecord[] = await checksRes.json();
        setDbRecords(recordsData);

        // Separate records by subPos
        const singleRecordMap: Record<string, SeatStatus> = {};
        const doubleRecordMap: Record<string, DoubleSeat> = {};
        for (const r of recordsData) {
          const key = seatKey(r.baris, r.kolom);
          if (r.subPos === 0) {
            singleRecordMap[key] = r.status;
          } else if (r.subPos === 1) {
            if (!doubleRecordMap[key])
              doubleRecordMap[key] = { left: "PRODUCING", right: "PRODUCING" };
            doubleRecordMap[key].left = r.status;
          } else if (r.subPos === 2) {
            if (!doubleRecordMap[key])
              doubleRecordMap[key] = { left: "PRODUCING", right: "PRODUCING" };
            doubleRecordMap[key].right = r.status;
          }
        }

        // Initialise: use DB record if saved, otherwise PRODUCING (default)
        // Positions beyond the chicken budget are EMPTY (cumulative weighted count)
        const singleMap: Record<SeatKey, SeatStatus> = {};
        const doubleMap: Record<string, DoubleSeat> = {};
        let pos = 0;
        let cumulativeChickens = 0;
        const jmlAyamVal = masterData.jmlAyam;
        for (let baris = 1; baris <= localTotalBaris; baris++) {
          for (let kolom = 1; kolom <= 8; kolom++) {
            if (pos >= localTotalKandang) break;
            pos++;
            const isDouble = isDoubleKolom(baris, kolom, useDbDouble);
            const weight = isDouble ? 2 : 1;
            const hasChicken =
              jmlAyamVal === undefined ||
              cumulativeChickens + weight <= jmlAyamVal;
            if (hasChicken) cumulativeChickens += weight;

            if (isDouble) {
              const key = seatKey(baris, kolom);
              const saved = doubleRecordMap[key];
              doubleMap[key] =
                saved ?? { left: "PRODUCING", right: "PRODUCING" };
              if (!hasChicken) {
                doubleMap[key] = { left: "EMPTY", right: "EMPTY" };
              }
            } else {
              const key = seatKey(baris, kolom);
              singleMap[key] =
                singleRecordMap[key] ??
                (hasChicken ? "PRODUCING" : "EMPTY");
            }
          }
        }

        setSingleChecks(singleMap);
        setDoubleSeats(doubleMap);
        setLocalJmlAyam(cumulativeChickens);
        setOriginalSingleChecks(JSON.stringify(singleMap));
        setOriginalDoubleSeats(JSON.stringify(doubleMap));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  // ---- Data fetching ----
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- pre-existing pattern used across codebase */
  useEffect(() => {
    fetchData();
  }, [selectedDate, kandang]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // ---- Pointer handlers (single seats) ----
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
    if (!(key in singleChecks)) return;

    clearPressTimer();
    pressTargetRef.current = { baris, kolom };

    pressTimerRef.current = setTimeout(() => {
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
      clearPressTimer();
      setSingleChecks((prev) => {
        const current = prev[key];
        if (current === "EMPTY") {
          setLocalJmlAyam((prevAyam) => prevAyam + 1);
          return { ...prev, [key]: "PRODUCING" };
        }
        const next =
          current === "PRODUCING" ? "NOT_PRODUCING" : "PRODUCING";
        return { ...prev, [key]: next };
      });
    }
  }

  function handlePointerCancel() {
    clearPressTimer();
  }

  // ---- Popup handlers (double seats) ----
  const popupPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
        const next =
          current === "PRODUCING" ? "NOT_PRODUCING" : "PRODUCING";
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

  // Clear popup timers on close
  useEffect(() => {
    if (!popupTarget) clearPopupPressTimer();
  }, [popupTarget]);

  // ---- Diff & Save ----
  async function handleSave() {
    if (!cageMaster?.id || !hasChanges) return;

    const changedPositions = computeChangedPositions(
      singleChecks,
      doubleSeats,
      originalSingleChecks,
      originalDoubleSeats,
    );
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

  function handleDoubleSeatClick(baris: number, kolom: number, rect: DOMRect) {
    setPopupTarget({ baris, kolom, rect });
  }

  // ---- Render ----
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
                {" "}
                &bull; {totalBaris} baris &bull;{" "}
                {cageMaster.jmlKandang || totalPositions} kandang &bull;{" "}
                {cageMaster.jmlAyam ?? 0} ayam
              </span>
            )}
          </p>
        </div>
        <DateSelector
          value={selectedDate}
          onChange={(d) => setSelectedDate(d || getWIBDateString())}
        />
      </div>

      {/* Summary card */}
      {totalPositions > 0 && (
        <SummaryCard
          producingCount={producingCount}
          totChickens={totChickens}
          selectedDate={selectedDate}
        />
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

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Seat grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
            <TrainSeatsGrid
              cageMaster={cageMaster}
              totalPositions={totalPositions}
              totalBaris={totalBaris}
              singleChecks={singleChecks}
              doubleSeats={doubleSeats}
              getSeatColor={getSeatColorBound}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onDoubleSeatClick={handleDoubleSeatClick}
            />

            {/* Legend */}
            {totalPositions > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-slate-100">
                {[
                  { color: "bg-emerald-500", label: "Produksi" },
                  { color: "bg-blue-500", label: "1 Hari" },
                  { color: "bg-amber-400", label: "2 Hari" },
                  { color: "bg-orange-500", label: "3 Hari" },
                  { color: "bg-red-500", label: "4+ Hari" },
                  { color: "bg-gray-900", label: "Kosong" },
                ].map(({ color, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500"
                  >
                    <div className={`w-3.5 h-3.5 rounded-md ${color}`} />{" "}
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky save button */}
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
      <Popup
        popupTarget={popupTarget}
        doubleSeats={doubleSeats}
        onClose={() => setPopupTarget(null)}
        onPointerDown={handlePopupPointerDown}
        onPointerUp={handlePopupPointerUp}
        onPointerCancel={handlePopupPointerCancel}
        getSeatColor={getSeatColorBound}
      />
    </div>
  );
}
