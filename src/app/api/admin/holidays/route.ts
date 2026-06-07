import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { holidaySchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const rows = await getAllRows<any>('Holidays');
  return json(rows);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const body = await req.json().catch(() => ({}));
  const parsed = holidaySchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const now = new Date().toISOString();
  const row = {
    holiday_id: makeId('hol'),
    ...parsed.data,
    created_by: ctx.user!.user_id,
    created_at: now,
    updated_at: now,
  };

  await appendRow('Holidays', row);
  await auditLog(ctx.user, 'CREATE', 'Holidays', row.holiday_id, null, row, ctx.ip);
  return json(row, 201);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const body = await req.json().catch(() => ({}));
  if (!body.holiday_id) return bad('holiday_id required');

  const old = (await getAllRows<any>('Holidays')).find(h => h.holiday_id === body.holiday_id);
  if (!old) return bad('Holiday not found');

  const patch = { ...body, updated_at: new Date().toISOString() };
  delete patch.holiday_id;

  const updated = await updateRowById('Holidays', 'holiday_id', body.holiday_id, patch);
  await auditLog(ctx.user, 'UPDATE', 'Holidays', body.holiday_id, old, updated, ctx.ip);
  return json(updated);
}
