"use client";

import type { SeatStatus, DoubleSeat } from "./types";

type DoubleSeatButtonProps = {
  baris: number;
  kolom: number;
  seat: DoubleSeat | undefined;
  getSeatColor: (
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos?: number,
  ) => string;
  onClick: (baris: number, kolom: number, rect: DOMRect) => void;
};

/**
 * Double seat button — renders left/right halves with a vertical divider.
 * Clicking opens the popup overlay for sub-position toggling.
 * When seat is undefined (beyond-capacity slot), renders a faded placeholder.
 */
export default function DoubleSeatButton({
  baris,
  kolom,
  seat,
  getSeatColor,
  onClick,
}: DoubleSeatButtonProps) {
  if (!seat) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick(baris, kolom, e.currentTarget.getBoundingClientRect());
        }}
        className="rounded-lg md:rounded-xl flex items-center justify-center h-9 md:h-11 bg-emerald-500/20 border border-dashed border-emerald-300 transition-all duration-150 select-none opacity-40"
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(baris, kolom, e.currentTarget.getBoundingClientRect());
      }}
      className="relative rounded-lg md:rounded-xl flex items-center justify-center h-9 md:h-11 overflow-hidden transition-all duration-150 select-none"
    >
      {/* Left half */}
      <div
        className={`flex-1 h-full flex items-center justify-center ${getSeatColor(seat.left, baris, kolom, 1)}`}
      />
      {/* Vertical divider */}
      <div className="w-px bg-white/50 shrink-0 h-full" />
      {/* Right half */}
      <div
        className={`flex-1 h-full flex items-center justify-center ${getSeatColor(seat.right, baris, kolom, 2)}`}
      />
    </button>
  );
}
