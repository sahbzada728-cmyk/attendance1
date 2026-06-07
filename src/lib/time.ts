/**
 * Time utilities – Asia/Karachi (PKT, UTC+5, no DST)
 */
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, addMinutes } from 'date-fns';
import type { OfficeSettings } from '@/types';

export const DEFAULT_TZ = 'Asia/Karachi';

export function nowInTz(tz: string = DEFAULT_TZ): Date {
  return toZonedTime(new Date(), tz);
}

/** YYYY-MM-DD in the given timezone */
export function todayKey(tz: string = DEFAULT_TZ): string {
  return formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
}

/** HH:mm in the given timezone */
export function nowTime(tz: string = DEFAULT_TZ): string {
  return formatInTimeZone(new Date(), tz, 'HH:mm');
}

/** Parse "HH:mm" string and return total minutes since midnight */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** True if hhmm is between start and end (inclusive) */
export function isWithinWindow(hhmm: string, start: string, end: string): boolean {
  const t = toMinutes(hhmm);
  return t >= toMinutes(start) && t <= toMinutes(end);
}

/** Returns the attendance window {start, end} */
export function attendanceWindow(settings: Pick<OfficeSettings, 'office_start_time' | 'attendance_grace_minutes'>) {
  const start = String(settings.office_start_time);
  const graceMs = Number(settings.attendance_grace_minutes) || 20;
  const startDate = new Date(`1970-01-01T${start}:00Z`);
  const endDate = addMinutes(startDate, graceMs);
  const end = format(endDate, 'HH:mm');
  return { start, end };
}

/** Returns the progress report window {start, end} */
export function progressWindow(settings: Pick<OfficeSettings, 'office_end_time' | 'progress_report_window_minutes'>) {
  const end = String(settings.office_end_time);
  const windowMinutes = Number(settings.progress_report_window_minutes) || 30;
  const endDate = new Date(`1970-01-01T${end}:00Z`);
  const startDate = addMinutes(endDate, -windowMinutes);
  const start = format(startDate, 'HH:mm');
  return { start, end };
}

/** Returns 'Present', 'Late', or null (outside window) */
export function attendanceStatusAt(hhmm: string, settings: Pick<OfficeSettings, 'office_start_time' | 'attendance_grace_minutes'>): 'Present' | 'Late' | null {
  const win = attendanceWindow(settings);
  if (!isWithinWindow(hhmm, win.start, win.end)) return null;
  const t = toMinutes(hhmm);
  const start = toMinutes(win.start);
  return t <= start ? 'Present' : 'Late';
}

/** Format date for display */
export function fmtDate(iso: string): string {
  try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return iso; }
}

/** Format datetime for display */
export function fmtDatetime(iso: string): string {
  try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; }
}
