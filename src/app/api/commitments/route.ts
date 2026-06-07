import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, makeId } from '@/lib/sheets';
import { todayKey } from '@/lib/time';
import { isWorkingDay } from '@/lib/business';
import { commitmentSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const rows = await getAllRows<any>('Daily_Commitments');
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  let data = ctx.user!.role === 'CEO_SUPER_ADMIN' ? rows : rows.filter(r => r.employee_id === ctx.user!.employee_id);
  if (date) data = data.filter(r => r.date === date);
  return json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'EMPLOYEE') return forbid('Only employees submit daily commitments.');

  const date = todayKey(String(ctx.settings.timezone));
  if (!(await isWorkingDay(date))) return bad('Commitment not required on Sunday/public holidays.');

  const body = await req.json().catch(() => ({}));
  const parsed = commitmentSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const existing = (await getAllRows<any>('Daily_Commitments')).find(
    c => c.employee_id === ctx.user!.employee_id && c.date === date
  );
  if (existing) return bad('Daily commitment already submitted for today.');

  const row = {
    commitment_id: makeId('commit'),
    employee_id: ctx.user!.employee_id,
    date,
    ...parsed.data,
    submitted_at: new Date().toISOString(),
    submitted_ip: ctx.ip,
    status: 'Submitted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await appendRow('Daily_Commitments', row);
  await auditLog(ctx.user, 'CREATE', 'Daily_Commitments', row.commitment_id, null, row, ctx.ip);
  return json(row, 201);
}
