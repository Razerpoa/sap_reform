/**
 * Indonesian number abbreviation utilities
 * Converts large numbers to compact format: Rb (Ribu), Jt (Juta), M (Miliar), T (Triliun)
 */

/**
 * Format a number into Indonesian abbreviation (Rb/Jt/M/T)
 * @param value - The number to format
 * @param suffix - Optional unit suffix (e.g., "kg", "telur"). If omitted, no unit shown.
 * @returns Formatted string, e.g., "1.5 Jt" or "1.5 Jt kg"
 */
export function formatNumber(value: number, suffix?: string): string {
  if (value === 0) {
    return suffix ? `0 ${suffix}` : "0";
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  let result: string;

  if (absValue < 1000) {
    // Below 1,000 - show as regular number
    result = absValue.toLocaleString("id-ID");
  } else if (absValue < 1000000) {
    // 1,000 - 999,999 → Ribu (Rb)
    result = (absValue / 1000).toFixed(1).replace(/\.0$/, "") + " rb";
  } else if (absValue < 1000000000) {
    // 1,000,000 - 999,999,999 → Juta (Jt)
    result = (absValue / 1000000).toFixed(1).replace(/\.0$/, "") + " jt";
  } else if (absValue < 1000000000000) {
    // 1,000,000,000 - 999,999,999,999 → Miliar (M)
    result = (absValue / 1000000000).toFixed(1).replace(/\.0$/, "") + " M";
  } else {
    // 1,000,000,000,000+ → Triliun (T)
    result = (absValue / 1000000000000).toFixed(1).replace(/\.0$/, "") + " T";
  }

  const withUnit = suffix ? `${sign}${result} ${suffix}` : `${sign}${result}`;
  return withUnit;
}

/**
 * Format a number with dot separators (Indonesian locale)
 * @param value - The number to format
 * @returns Formatted string, e.g., "1.500.000"
 */
export function formatNumberFull(value: number): string {
  return value.toLocaleString("id-ID");
}