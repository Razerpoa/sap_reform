/**
 * Indonesian number abbreviation utilities
 * Converts large numbers to compact format: Rb (Ribu), Jt (Juta), M (Miliar), T (Triliun)
 */

/**
 * Format a number into abbreviated or full Indonesian format
 * @param value - The number to format
 * @param suffix - Optional unit suffix (e.g., "kg", "telur"). If omitted, no unit shown.
 * @param abbreviate - Optional. Defaults to true. When true, abbreviates to rb/jt/M/T. When false, shows full number with Indonesian locale separators.
 * @returns Formatted string, e.g., "1.5 jt" (abbreviate=true) or "1.500.000" (abbreviate=false), with optional suffix appended.
 */
export function formatNumber(value: number, suffix?: string, abbreviate?: boolean): string {
  if (value === 0) {
    return suffix ? `0 ${suffix}` : "0";
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  abbreviate ??= false;

  let result: string;

  if (!abbreviate) {
    // Full number with Indonesian locale dot separators
    result = absValue.toLocaleString("id-ID");
  } else if (absValue < 1000) {
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