"use client";

import type { SeatStatus } from "./types";

type SeatButtonProps = {
  baris: number;
  kolom: number;
  occupied: boolean;
  status: SeatStatus;
  getSeatColor: (
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos?: number,
  ) => string;
  onPointerDown: (baris: number, kolom: number) => void;
  onPointerUp: (baris: number, kolom: number) => void;
  onPointerCancel: () => void;
};

/**
 * Single seat button — handles click/tap to toggle PRODUCING ↔ NOT_PRODUCING
 * and long-press to set EMPTY.
 * Replaces the 4× duplicated <button> block from the original inline code.
 */
export default function SeatButton({
  baris,
  kolom,
  occupied,
  status,
  getSeatColor,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: SeatButtonProps) {
  return (
    <button
      onPointerDown={() => onPointerDown(baris, kolom)}
      onPointerUp={() => onPointerUp(baris, kolom)}
      onPointerLeave={onPointerCancel}
      onPointerCancel={onPointerCancel}
      title={occupied ? `Baris ${baris} Kolom ${kolom}` : undefined}
      className={`relative rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-150 select-none h-9 md:h-11 ${
        occupied
          ? getSeatColor(status, baris, kolom)
          : "bg-slate-50 border border-dashed border-slate-200"
      }`}
    />
  );
}
