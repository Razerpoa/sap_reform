/**
 * Shared types for Production data structure
 */

export type CageRow = {
  peti: boolean;
  tray: number;
  butir: number;
};

export type CageExtra = {
  extraTray: number;
  extraButir: number;
  extraKg: number;
};

export type CageData = {
  rows: CageRow[];
  extra: CageExtra;
};

export type ProductionCageData = Record<string, CageData>;

export type GlobalStats = {
  totalKg: number;
  totalPeti: number;
  totalTray: number;
  totalButir: number;
};

export const initializeCageData = (cageName: string): CageData => ({
  rows: [
    { peti: false, tray: 0, butir: 0 },
    { peti: false, tray: 0, butir: 0 },
    { peti: false, tray: 0, butir: 0 },
  ],
  extra: { extraTray: 0, extraButir: 0, extraKg: 0 },
});

export const calculateGlobalStats = (
  cages: { kandang: string }[],
  getCageData: (key: string) => CageData
): GlobalStats => {
  let totalKg = 0;
  let totalPeti = 0;
  let totalTray = 0;
  let totalButir = 0;

  cages.forEach((cage) => {
    const cageInfo = getCageData(cage.kandang);
    
    cageInfo.rows?.forEach((row: CageRow) => {
      totalButir += row.butir || 0;
      totalTray += row.tray || 0;
      if (row.peti) {
        totalKg += 15;
        totalPeti += 1;
      }
    });
    
    totalButir += cageInfo.extra?.extraButir || 0;
    totalTray += cageInfo.extra?.extraTray || 0;
    totalKg += cageInfo.extra?.extraKg || 0;
  });

  return { totalKg, totalPeti, totalTray, totalButir };
};