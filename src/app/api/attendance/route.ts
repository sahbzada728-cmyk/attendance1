import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { attendanceStatusAt, attendanceWindow, nowTime, todayKey } from '@/lib/time';
import { isWorkingDay } from '@/lib/business';
import { attendanceOverrideSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const rows = await getAllRows<any>('Attendance');
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || todayKey(String(ctx.settings.timezone));
  const data = ctx.user!.role === 'CEO_SUPER_ADMIN'
    ? rows.filter(r => !date || r.date === date)
    : rows.filter(r => r.employee_id === ctx.user!.employee_id);
  return json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const user = ctx.user!;
  if (user.role !== 'EMPLOYEE') return forbid('Only employees mark own attendance. Use PATCH for CEO override.');

  const date = todayKey(String(ctx.settings.timezone));
  if (!(await isWorkingDay(date))) return bad('Attendance is not required on Sunday/public holidays.');

  const time = nowTime(String(ctx.settings.timezone));
  const status = attendanceStatusAt(time, ctx.settings);
  const win = attendanceWindow(ctx.settings);

  if (!status) return bad(`Attendance window is ${win.start} to ${win.end}. Current time: ${time}.`);

  const existing = (await getAllRows<any>('Attendance')).find(
    a => a.employee_id === user.employee_id && a.date === date
  );
  if (existing) return bad('Attendance already submitted for today.');

  const row = {
    attendance_id: makeId('att'),
    employee_id: user.employee_id,
    date,
    time_in: time,
    status,
    ip_address: ctx.ip,
    ipv6_address: ctx.ip.includes(':') ? ctx.ip : '',
    device_info: req.headers.get('user-agent') || '',
    is_within_allowed_window: true,
    is_from_allowed_ip: true,
    override_by: '',
    override_reason: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await appendRow('Attendance', row);
  await auditLog(user, 'CREATE', 'Attendance', row.attendance_id, null, row, ctx.ip, row.device_info);
  return json(row, 201);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid('Only CEO/Super Admin can override attendance.');

  const body = await req.json().catch(() => ({}));
  const parsed = attendanceOverrideSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const row = {
    attendance_id: makeId('att_ov'),
    employee_id: parsed.data.employee_id,
    date: parsed.data.date,
    time_in: nowTime(String(ctx.settings.timezone)),
    status: parsed.data.status,
    ip_address: ctx.ip,
    ipv6_address: '',
    device_info: req.headers.get('user-agent') || '',
    is_within_allowed_window: true,
    is_from_allowed_ip: true,
    override_by: ctx.user!.user_id,
    override_reason: parsed.data.override_reason,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await appendRow('Attendance', row);
  await auditLog(ctx.user, 'OVERRIDE', 'Attendance', row.attendance_id, null, row, ctx.ip);
  return json(row, 201);
}
