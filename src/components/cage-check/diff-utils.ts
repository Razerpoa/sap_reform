import type { SeatStatus, SeatKey, DoubleSeat } from "./types";

/**
 * Compare current state with original snapshots and return only changed positions.
 * subPos: 0 = single, 1 = left (double), 2 = right (double).
 */
export function computeChangedPositions(
  singleChecks: Record<SeatKey, SeatStatus>,
  doubleSeats: Record<string, DoubleSeat>,
  originalSingleChecks: string,
  originalDoubleSeats: string,
): { baris: number; kolom: number; subPos: number; status: SeatStatus }[] {
  const changes: {
    baris: number;
    kolom: number;
    subPos: number;
    status: SeatStatus;
  }[] = [];

  // Diff single checks (subPos = 0)
  const originalSingle: Record<SeatKey, SeatStatus> = originalSingleChecks
    ? JSON.parse(originalSingleChecks)
    : {};
  for (const key of Object.keys(singleChecks)) {
    const sk = key as SeatKey;
    if (singleChecks[sk] !== originalSingle[sk]) {
      const [b, k] = key.split("-");
      changes.push({
        baris: parseInt(b),
        kolom: parseInt(k),
        subPos: 0,
        status: singleChecks[sk],
      });
    }
  }

  // Diff double seats (subPos = 1 for left, 2 for right)
  const originalDouble: Record<string, DoubleSeat> = originalDoubleSeats
    ? JSON.parse(originalDoubleSeats)
    : {};
  for (const key of Object.keys(doubleSeats)) {
    const current = doubleSeats[key];
    const original = originalDouble[key];
    const [bStr, kStr] = key.split("-");
    const baris = parseInt(bStr);
    const kolom = parseInt(kStr);
    if (!original || current.left !== original.left) {
      changes.push({ baris, kolom, subPos: 1, status: current.left });
    }
    if (!original || current.right !== original.right) {
      changes.push({ baris, kolom, subPos: 2, status: current.right });
    }
  }

  return changes;
}
