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

  // All records loaded from DB (sparse — only explicitly saved positions)
  const [dbRecords, setDbRecords] = useState<any[]>([]);

  const KOLOM_PER_BARIS = 8;

  const totalCages = cageMaster?.jmlKandang || cageMaster?.jmlAyam || 0;
  const totalBaris = Math.ceil(totalCages / KOLOM_PER_BARIS);
  const producingCount = Object.values(checks).filter((s) => s === "PRODUCING").length;

  // Ref for calendar-week calculation (avoids stale closure in render)
  const dbRecordsRef = useRef(dbRecords);
  useEffect(() => { dbRecordsRef.current = dbRecords; }, [dbRecords]);

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
        const localTotalBaris = Math.ceil(localTotalKandang / KOLOM_PER_BARIS);

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
        const checkMap: Record<SeatKey, SeatStatus> = {};
        let pos = 0;
        for (let baris = 1; baris <= localTotalBaris; baris++) {
          for (let kolom = 1; kolom <= KOLOM_PER_BARIS; kolom++) {
            if (pos < localTotalKandang) {
              const key = seatKey(baris, kolom);
              checkMap[key] = recordMap[key] || "PRODUCING";
              pos++;
            }
          }
        }

        setChecks(checkMap);
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
   * Compute calendar weeks since the NOT_PRODUCING streak started.
   * Uses the oldest NOT_PRODUCING record for this position in the DB.
   */
  function getCalendarWeeksSinceStreak(baris: number, kolom: number): number {
    const data = dbRecordsRef.current;
    const seatRecords = data
      .filter((r: any) => r.baris === baris && r.kolom === kolom && r.status === "NOT_PRODUCING")
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (seatRecords.length === 0) return 0;

    const streakStart = new Date(seatRecords[0].date);
    streakStart.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysSince = Math.floor(
      (today.getTime() - streakStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince < 7) return 1;
    if (daysSince < 14) return 2;
    return 3;
  }

  function toggleCage(baris: number, kolom: number) {
    const key = seatKey(baris, kolom);
    setChecks((prev) => {
      const current = prev[key];
      const next =
        current === "PRODUCING" ? "NOT_PRODUCING"
        : current === "NOT_PRODUCING" ? "EMPTY"
        : "PRODUCING";
      return { ...prev, [key]: next };
    });
  }

  function getSeatColor(status: SeatStatus, baris: number, kolom: number): string {
    if (status === "EMPTY") return "bg-gray-900 text-white";
    if (status === "PRODUCING") return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
    const weeks = getCalendarWeeksSinceStreak(baris, kolom);
    if (weeks >= 3) return "bg-red-500 text-white";
    if (weeks === 2) return "bg-amber-400 text-white";
    return "bg-blue-500 text-white";
  }

  function renderSeatIcon(status: SeatStatus, baris: number, kolom: number) {
    if (status === "EMPTY") return <X className="w-3.5 h-3.5" />;
    if (status === "PRODUCING") return <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />;
    const weeks = getCalendarWeeksSinceStreak(baris, kolom);
    return <span className="text-xs font-black">{weeks}w</span>;
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
    if (!cageMaster || totalCages === 0) {
      return (
        <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
          Kandang ini tidak memiliki kandang. Atur jumlah kandang di Data Master.
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {/* Column headers */}
        <div className="flex items-center gap-1 md:gap-2 mb-3">
          <div className="w-8 shrink-0" />
          <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
            {[1, 2, 3, 4].map((k) => (
              <div key={`hl-${k}`} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {k}
              </div>
            ))}
          </div>
          <div className="w-4 md:w-8 shrink-0" />
          <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
            {[5, 6, 7, 8].map((k) => (
              <div key={`hr-${k}`} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
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
          const occupiedKoloms: number[] = [];
          for (let k = 1; k <= KOLOM_PER_BARIS; k++) {
            if (seatKey(baris, k) in checks) occupiedKoloms.push(k);
          }
          if (occupiedKoloms.length === 0) return null;

          return (
            <div key={baris} className="flex items-center gap-1 md:gap-2">
              <div className="w-8 shrink-0 text-center">
                <span className="text-[10px] font-black text-slate-300">{baris}</span>
              </div>

              {/* Left side: kolom 1-4 */}
              <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
                {[1, 2, 3, 4].map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`l-${kolom}`}
                      onClick={() => occupied && toggleCage(baris, kolom)}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                      className={`h-9 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${
                        occupied
                          ? getSeatColor(checks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && renderSeatIcon(checks[key], baris, kolom)}
                    </button>
                  );
                })}
              </div>

              {/* Aisle */}
              <div className="w-4 md:w-8 shrink-0 flex justify-center">
                <div className="w-px md:w-0.5 h-7 md:h-9 bg-slate-100 rounded-full" />
              </div>

              {/* Right side: kolom 5-8 */}
              <div className="flex-1 grid grid-cols-4 gap-1 md:gap-2">
                {[5, 6, 7, 8].map((kolom) => {
                  const occupied = occupiedKoloms.includes(kolom);
                  const key = seatKey(baris, kolom);
                  return (
                    <button
                      key={`r-${kolom}`}
                      onClick={() => occupied && toggleCage(baris, kolom)}
                      title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
                      className={`h-9 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${
                        occupied
                          ? getSeatColor(checks[key], baris, kolom)
                          : "bg-slate-50 border border-dashed border-slate-200"
                      }`}
                    >
                      {occupied && renderSeatIcon(checks[key], baris, kolom)}
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
                {" "}&bull; {totalBaris} baris &bull; {cageMaster.jmlKandang || totalCages} kandang &bull; {cageMaster.jmlAyam} ayam
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
      {totalCages > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Produksi ({selectedDate})
              </p>
              <p className="text-2xl md:text-3xl font-black mt-1">
                {producingCount}
                <span className="text-sm text-slate-400 font-medium"> / {totalCages}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Persentase
              </p>
              <p className="text-2xl md:text-3xl font-black mt-1">
                {totalCages > 0 ? Math.round((producingCount / totalCages) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="mt-4 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${totalCages > 0 ? (producingCount / totalCages) * 100 : 0}%` }}
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
            {totalCages > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" /> Produksi
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-blue-500" /> 1 Mg
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-amber-400" /> 2 Mg
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className="w-3.5 h-3.5 rounded-md bg-red-500" /> 3+ Mg
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
