import type { SeatStatus } from "@/lib/data";
export type { SeatStatus };
export type SeatKey = `${number}-${number}`;
export type DoubleSeat = { left: SeatStatus; right: SeatStatus };

/** Shape of a cage-check record returned by the API (Prisma model). */
export interface CageCheckRecord {
  id?: string;
  baris: number;
  kolom: number;
  subPos: number;
  status: SeatStatus;
  date: string;
  cageMasterId?: string;
}

/** Minimal cage-master shape consumed by the check page. */
export interface CageMasterData {
  id: string;
  kandang: string;
  jmlKandang?: number;
  jmlAyam?: number;
  doubleRows?: boolean;
}
