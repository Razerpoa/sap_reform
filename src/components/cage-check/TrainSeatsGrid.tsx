"use client";

import SeatButton from "./SeatButton";
import DoubleSeatButton from "./DoubleSeatButton";
import { seatKey, isDoubleRow, isDoubleKolom } from "./layout-utils";
import type { SeatStatus, SeatKey, DoubleSeat, CageMasterData } from "./types";

type TrainSeatsGridProps = {
  cageMaster: CageMasterData | null;
  totalPositions: number;
  totalBaris: number;
  singleChecks: Record<SeatKey, SeatStatus>;
  doubleSeats: Record<string, DoubleSeat>;
  getSeatColor: (
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos?: number,
  ) => string;
  onPointerDown: (baris: number, kolom: number) => void;
  onPointerUp: (baris: number, kolom: number) => void;
  onPointerCancel: () => void;
  onDoubleSeatClick: (baris: number, kolom: number, rect: DOMRect) => void;
};

/**
 * Train-seat-style grid of cage check positions.
 * Renders single and double rows with the correct seat buttons
 * and colour-coded status feedback.
 * Double rows have all 8 columns as double seats.
 */
export default function TrainSeatsGrid({
  cageMaster,
  totalPositions,
  totalBaris,
  singleChecks,
  doubleSeats,
  getSeatColor,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onDoubleSeatClick,
}: TrainSeatsGridProps) {
  if (!cageMaster || totalPositions === 0) {
    return (
      <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
        Kandang ini tidak memiliki kandang. Atur jumlah kandang di Data Master.
      </div>
    );
  }

  const doubleRowsEnabled = cageMaster?.doubleRows !== false;
  const colGroups = {
    left: [1, 2, 3, 4],
    right: [5, 6, 7, 8],
  };

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-1 md:gap-2 mb-1">
        <div className="w-8 shrink-0" />
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            className="flex-1 grid grid-cols-4 gap-1 md:gap-2"
          >
            {colGroups[side].map((k) => (
              <div
                key={`h-${side[0]}-${k}`}
                className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider"
              >
                {k}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Side labels */}
      <div className="flex items-center gap-1 md:gap-2 mb-2">
        <div className="w-8 shrink-0" />
        <div className="flex-1 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
          Kiri
        </div>
        <div className="w-4 md:w-8 shrink-0" />
        <div className="flex-1 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
          Kanan
        </div>
      </div>

      {/* Seat rows */}
      {Array.from({ length: totalBaris }, (_, i) => {
        const baris = i + 1;
        const double = isDoubleRow(baris, doubleRowsEnabled);

        // Determine which columns are occupied
        const occupiedKoloms: number[] = [];
        const occupiedDoubleKoloms: number[] = [];
        for (let k = 1; k <= 8; k++) {
          if (isDoubleKolom(baris, k, doubleRowsEnabled)) {
            if (seatKey(baris, k) in doubleSeats) occupiedDoubleKoloms.push(k);
          } else {
            if (seatKey(baris, k) in singleChecks) occupiedKoloms.push(k);
          }
        }
        if (
          occupiedDoubleKoloms.length === 0 &&
          occupiedKoloms.length === 0
        )
          return null;

        return (
          <div key={baris} className="flex items-center gap-1 md:gap-2">
            {/* Row number */}
            <div className="w-8 shrink-0 text-center leading-none">
              <span className="text-[10px] font-black text-slate-300">
                {baris}
              </span>
            </div>

            {/* Left side */}
            <div className="flex-1 grid gap-1 md:gap-2 grid-cols-4">
              {colGroups.left.map((kolom) =>
                double && kolom === 1 ? (
                  <div
                    key={`empty-${baris}-${kolom}`}
                    className="h-9 md:h-11"
                  />
                ) : double ? (
                  <DoubleSeatButton
                    key={`d-${kolom}`}
                    baris={baris}
                    kolom={kolom}
                    seat={doubleSeats[seatKey(baris, kolom)]}
                    getSeatColor={getSeatColor}
                    onClick={onDoubleSeatClick}
                  />
                ) : (
                  <SeatButton
                    key={`l-${kolom}`}
                    baris={baris}
                    kolom={kolom}
                    occupied={occupiedKoloms.includes(kolom)}
                    status={singleChecks[seatKey(baris, kolom)]}
                    getSeatColor={getSeatColor}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                  />
                ),
              )}
            </div>

            {/* Aisle */}
            <div className="w-4 md:w-8 shrink-0 flex justify-center">
              <div className="w-px md:w-0.5 h-7 md:h-9 bg-slate-100 rounded-full" />
            </div>

            {/* Right side */}
            <div className="flex-1 grid gap-1 md:gap-2 grid-cols-4">
              {colGroups.right.map((kolom) =>
                double && kolom === 8 ? (
                  <div
                    key={`empty-${baris}-${kolom}`}
                    className="h-9 md:h-11"
                  />
                ) : double ? (
                  <DoubleSeatButton
                    key={`d-${kolom}`}
                    baris={baris}
                    kolom={kolom}
                    seat={doubleSeats[seatKey(baris, kolom)]}
                    getSeatColor={getSeatColor}
                    onClick={onDoubleSeatClick}
                  />
                ) : (
                  <SeatButton
                    key={`r-${kolom}`}
                    baris={baris}
                    kolom={kolom}
                    occupied={occupiedKoloms.includes(kolom)}
                    status={singleChecks[seatKey(baris, kolom)]}
                    getSeatColor={getSeatColor}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                  />
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
