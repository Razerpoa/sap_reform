"use client";

import SubToggleButton from "./SubToggleButton";
import { seatKey } from "./layout-utils";
import type { SeatStatus, DoubleSeat } from "./types";

type PopupProps = {
  popupTarget: { baris: number; kolom: number; rect: DOMRect } | null;
  doubleSeats: Record<string, DoubleSeat>;
  onClose: () => void;
  onPointerDown: (side: "left" | "right") => void;
  onPointerUp: (side: "left" | "right") => void;
  onPointerCancel: () => void;
  getSeatColor: (
    status: SeatStatus,
    baris: number,
    kolom: number,
    subPos: number,
  ) => string;
};

/**
 * Popup overlay positioned above a double-seat button.
 * Shows KIRI / KANAN sub-toggle buttons + a preview of current seat colours.
 */
export default function Popup({
  popupTarget,
  doubleSeats,
  onClose,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  getSeatColor,
}: PopupProps) {
  if (!popupTarget) return null;

  const { baris, kolom, rect } = popupTarget;
  const key = seatKey(baris, kolom);
  const seat = doubleSeats[key];
  if (!seat) return null;

  const popupTop = rect.top - 8;
  const popupLeft = rect.left + rect.width / 2;

  return (
    <>
      {/* Backdrop — catches outside clicks */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      {/* Popup card */}
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
              onPointerDown={() => onPointerDown("left")}
              onPointerUp={() => onPointerUp("left")}
              onPointerCancel={onPointerCancel}
              getSeatColor={getSeatColor}
            />
            <SubToggleButton
              label="KANAN"
              status={seat.right}
              baris={baris}
              kolom={kolom}
              subPos={2}
              onPointerDown={() => onPointerDown("right")}
              onPointerUp={() => onPointerUp("right")}
              onPointerCancel={onPointerCancel}
              getSeatColor={getSeatColor}
            />
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-16 h-7 rounded-md flex overflow-hidden border border-slate-100">
              <div
                className={`flex-1 ${getSeatColor(seat.left, baris, kolom, 1)}`}
              />
              <div className="w-px bg-white/50" />
              <div
                className={`flex-1 ${getSeatColor(seat.right, baris, kolom, 2)}`}
              />
            </div>
          </div>
        </div>

        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"
          style={{ bottom: "-6px" }}
        />
      </div>
    </>
  );
}
