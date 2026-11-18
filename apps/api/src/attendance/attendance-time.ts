/**
 * Attendance wall-clock helpers for Asia/Karachi (pure / unit-tested).
 * Avoid Date#setHours on UTC midnight — that uses the server's local TZ (UTC on Render).
 */

export const OFFICE_TZ = "Asia/Karachi";

/** Calendar YYYY-MM-DD in office timezone. */
export function officeDateKey(now = new Date(), timeZone = OFFICE_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Minutes since local midnight in office timezone. */
export function officeMinutesNow(now = new Date(), timeZone = OFFICE_TZ): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Parse "HH:mm" → minutes since midnight. */
export function parseHmToMinutes(hm: string | null | undefined): number {
  const [h, m] = (hm ?? "17:00").split(":").map(Number);
  return (h ?? 17) * 60 + (m ?? 0);
}

/** True when office-local time is at/after shift end. */
export function isPastShiftEnd(
  shiftEndHm: string | null | undefined,
  now = new Date(),
  timeZone = OFFICE_TZ,
): boolean {
  return officeMinutesNow(now, timeZone) >= parseHmToMinutes(shiftEndHm);
}

/**
 * Build a Date for shift end on a given attendance `date` (UTC midnight of that day),
 * interpreting HH:mm as Asia/Karachi wall clock.
 */
export function shiftEndInstantOnDate(
  attendanceDate: Date,
  shiftEndHm: string | null | undefined,
  timeZone = OFFICE_TZ,
): Date {
  const y = attendanceDate.getUTCFullYear();
  const mo = attendanceDate.getUTCMonth();
  const d = attendanceDate.getUTCDate();
  const mins = parseHmToMinutes(shiftEndHm);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  // Approximate: Karachi is UTC+5 with no DST. Stable for LMS office TZ.
  const offsetHours = timeZone === "Asia/Karachi" ? 5 : 5;
  return new Date(Date.UTC(y, mo, d, hh - offsetHours, mm, 0, 0));
}
