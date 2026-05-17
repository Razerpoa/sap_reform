import type { SeatStatus, CageCheckRecord } from "./types";

/**
 * Compute calendar days since the NOT_PRODUCING streak started.
 * Uses the oldest NOT_PRODUCING record for this position in the DB.
 * Returns number of days since streak start (0 = started today, -1 = no streak).
 */
function getDaysSinceStreak(
  baris: number,
  kolom: number,
  subPos: number,
  dbRecords: CageCheckRecord[],
  selectedDate: string,
): number {
  const seatRecords = [...dbRecords]
    .filter(
      (r) =>
        r.baris === baris &&
        r.kolom === kolom &&
        r.subPos === subPos &&
        r.status === "NOT_PRODUCING",
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

  if (seatRecords.length === 0) return -1;

  const streakStart = new Date(seatRecords[0].date);
  streakStart.setHours(0, 0, 0, 0);

  const refDate = new Date(selectedDate);
  refDate.setHours(0, 0, 0, 0);

  return Math.floor(
    (refDate.getTime() - streakStart.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Get Tailwind colour classes for a seat based on its status and streak.
 * EMPTY → gray, PRODUCING → green, NOT_PRODUCING → blue/yellow/orange/red (by streak days).
 */
export function getSeatColor(
  status: SeatStatus,
  baris: number,
  kolom: number,
  subPos: number,
  dbRecords: CageCheckRecord[],
  selectedDate: string,
): string {
  if (status === "EMPTY") return "bg-gray-900 text-white";
  if (status === "PRODUCING")
    return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";

  const days = getDaysSinceStreak(baris, kolom, subPos, dbRecords, selectedDate);
  if (days >= 3) return "bg-red-500 text-white";
  if (days === 2) return "bg-orange-500 text-white";
  if (days === 1) return "bg-amber-400 text-white";
  return "bg-blue-500 text-white";
}
