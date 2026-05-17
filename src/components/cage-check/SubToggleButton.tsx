"use client";

import type { SeatStatus } from "./types";

type SubToggleButtonProps = {
  label: string;
  status: SeatStatus;
  baris: number;
  kolom: number;
  subPos: number;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  getSeatColor: (
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos: number,
  ) => string;
};

/** Sub-toggle button used inside the double-seat popup (KIRI / KANAN). */
export default function SubToggleButton({
  label,
  status,
  baris,
  kolom,
  subPos,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  getSeatColor,
}: SubToggleButtonProps) {
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
