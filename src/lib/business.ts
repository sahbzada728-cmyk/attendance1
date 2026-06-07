import { getAllRows } from './sheets';
import { getSettings } from './auth';
import { format } from 'date-fns';

/** Pakistan public holidays 2025-2026 (baseline; CEO can add/edit) */
export const PK_HOLIDAYS_2025_2026: Array<{ name: string; date: string }> = [
  { name: 'Kashmir Solidarity Day', date: '2025-02-05' },
  { name: 'Pakistan Day', date: '2025-03-23' },
  { name: 'Eid ul-Fitr (Day 1)', date: '2025-03-30' },
  { name: 'Eid ul-Fitr (Day 2)', date: '2025-03-31' },
  { name: 'Eid ul-Fitr (Day 3)', date: '2025-04-01' },
  { name: 'Labour Day', date: '2025-05-01' },
  { name: 'Eid ul-Adha (Day 1)', date: '2025-06-06' },
  { name: 'Eid ul-Adha (Day 2)', date: '2025-06-07' },
  { name: 'Eid ul-Adha (Day 3)', date: '2025-06-08' },
  { name: 'Muharram / Ashura', date: '2025-07-06' },
  { name: 'Independence Day', date: '2025-08-14' },
  { name: 'Eid Milaad-un-Nabi', date: '2025-09-05' },
  { name: 'Iqbal Day', date: '2025-11-09' },
  { name: 'Quaid-e-Azam Day', date: '2025-12-25' },
  { name: 'Kashmir Solidarity Day', date: '2026-02-05' },
  { name: 'Pakistan Day', date: '2026-03-23' },
  { name: 'Labour Day', date: '2026-05-01' },
  { name: 'Independence Day', date: '2026-08-14' },
  { name: 'Iqbal Day', date: '2026-11-09' },
  { name: 'Quaid-e-Azam Day', date: '2026-12-25' },
];

/** Returns true if the given YYYY-MM-DD is a working day */
export async function isWorkingDay(date: string): Promise<boolean> {
  const settings = await getSettings();
  const d = new Date(date + 'T00:00:00');
  const dayName = format(d, 'EEEE'); // 'Monday', 'Sunday', etc.

  if (dayName === (settings.weekly_off_day || 'Sunday')) return false;

  // Check Sheets holidays
  let holidays: any[] = [];
  try { holidays = await getAllRows<any>('Holidays'); } catch { /* not seeded */ }

  const found = holidays.find(h => h.holiday_date === date);
  if (found) {
    // If marked as working_day by CEO override, it IS a working day
    if (String(found.is_working_day) === 'true') return true;
    return false;
  }

  // Check baseline PK holidays
  const baselineHoliday = PK_HOLIDAYS_2025_2026.find(h => h.date === date);
  if (baselineHoliday) return false;

  return true;
}
