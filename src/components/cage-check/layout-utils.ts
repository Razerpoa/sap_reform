import type { SeatKey } from "./types";

/** Rows 7-8 in each 8-row block are double rows (if doubleRows enabled). */
export function isDoubleRow(baris: number, doubleRows: boolean): boolean {
  if (!doubleRows) return false;
  return (baris - 1) % 8 >= 6;
}

/** In a double row, all 8 columns are double seats. */
export function isDoubleKolom(
  baris: number,
  _kolom: number,
  doubleRows: boolean,
): boolean {
  return isDoubleRow(baris, doubleRows);
}

/**
 * Compute total rows needed for a given number of cages/positions.
 * 6+2 row pattern: rows 1-6 single (8 cols), 7-8 double (all 8 cols double), repeat.
 * When doubleRows=false, all rows are single (8 cols each).
 * Block = 8 rows (6×8 + 2×8 = 64 cells).
 */
export function computeTotalBaris(
  totalKandang: number,
  doubleRows: boolean,
): number {
  if (!doubleRows) {
    return Math.ceil(totalKandang / 8);
  }
  const BLOCK_ROWS = 8;
  const BLOCK_CAPACITY = 64; // 6×8 + 2×8
  const fullBlocks = Math.floor(totalKandang / BLOCK_CAPACITY);
  const remainder = totalKandang % BLOCK_CAPACITY;
  if (remainder === 0) return fullBlocks * BLOCK_ROWS;
  // First 6 rows of a block are single (8 cols each = 48)
  if (remainder <= 48) return fullBlocks * BLOCK_ROWS + Math.ceil(remainder / 8);
  // After 6 single rows, remaining cells use double rows (8 cols each)
  return fullBlocks * BLOCK_ROWS + 6 + Math.ceil((remainder - 48) / 8);
}

export function seatKey(baris: number, kolom: number): SeatKey {
  return `${baris}-${kolom}`;
}
