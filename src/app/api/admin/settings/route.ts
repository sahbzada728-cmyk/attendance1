import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { officeSettingsSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  return json(ctx.settings);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const body = await req.json().catch(() => ({}));
  const parsed = officeSettingsSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const old = ctx.settings;
  const now = new Date().toISOString();
  const patch = { ...parsed.data, updated_by: ctx.user!.user_id, updated_at: now };

  const rows = await getAllRows<any>('Office_Settings');
  const existing = rows.find(r => r.setting_id === 'default');

  if (existing) {
    const updated = await updateRowById('Office_Settings', 'setting_id', 'default', patch);
    await auditLog(ctx.user, 'UPDATE', 'Office_Settings', 'default', old, updated, ctx.ip);
    return json(updated);
  } else {
    const row = { setting_id: 'default', ...patch, created_at: now };
    await appendRow('Office_Settings', row);
    await auditLog(ctx.user, 'CREATE', 'Office_Settings', 'default', null, row, ctx.ip);
    return json(row, 201);
  }
}
