import { startOfDay } from "date-fns";

/**
 * Returns the current date string in WIB (Asia/Jakarta) timezone
 * Format: YYYY-MM-DD
 */
export function getWIBDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Checks if a given date is "today" in the WIB (Asia/Jakarta) timezone.
 */
export function isTodayWIB(date: Date) {
  const targetStr = getWIBDateString(date);
  const todayStr = getWIBDateString(new Date());
  return targetStr === todayStr;
}

/**
 * Checks if a date (as string YYYY-MM-DD or Date) is "today" in WIB timezone.
 */
export function isTodayWIBString(dateStr: string) {
  const targetDate = new Date(dateStr);
  return isTodayWIB(targetDate);
}

/**
 * Normalizes a date to the start of the day in UTC, 
 * but based on the input string interpreted in some context.
 * In this app, we often use new Date(validatedData.date) where date is YYYY-MM-DD.
 * JavaScript interprets YYYY-MM-DD as UTC midnight.
 */
export function normalizeDate(date: Date) {
  return startOfDay(date);
}
