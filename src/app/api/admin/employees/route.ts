import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { employeeSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();
  const employees = await getAllRows<any>('Employees');
  return json(employees);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const body = await req.json().catch(() => ({}));
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const employees = await getAllRows<any>('Employees');
  const empNos = employees.map(e => Number(e.employee_no) || 0);
  const nextNo = Math.max(0, ...empNos) + 1;

  const now = new Date().toISOString();
  const row = {
    employee_id: makeId('emp'),
    employee_no: nextNo,
    ...parsed.data,
    office_timing_group: 'default',
    access_rule: 'Office Wi-Fi/IP only',
    wifi_protocol: '',
    network_band: '',
    network_channel: '',
    ipv4_dns: '',
    ipv6_addresses: '',
    observed_ipv6_prefix: '',
    adapter_manufacturer: '',
    adapter_description: '',
    driver_version: '',
    created_at: now,
    updated_at: now,
  };

  await appendRow('Employees', row);
  await auditLog(ctx.user, 'CREATE', 'Employees', row.employee_id, null, row, ctx.ip);
  return json(row, 201);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const body = await req.json().catch(() => ({}));
  if (!body.employee_id) return bad('employee_id required');

  const old = (await getAllRows<any>('Employees')).find(e => e.employee_id === body.employee_id);
  if (!old) return bad('Employee not found');

  const patch = { ...body, updated_at: new Date().toISOString() };
  delete patch.employee_id;

  const updated = await updateRowById('Employees', 'employee_id', body.employee_id, patch);
  await auditLog(ctx.user, 'UPDATE', 'Employees', body.employee_id, old, updated, ctx.ip);
  return json(updated);
}
