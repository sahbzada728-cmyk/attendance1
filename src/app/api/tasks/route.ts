import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { taskSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const rows = await getAllRows<any>('Tasks');
  const data = ctx.user!.role === 'CEO_SUPER_ADMIN'
    ? rows
    : rows.filter(t => t.assigned_to === ctx.user!.employee_id);
  return json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid('Only CEO/Super Admin can assign tasks.');

  const body = await req.json().catch(() => ({}));
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const now = new Date().toISOString();
  const row = {
    task_id: makeId('task'),
    ...parsed.data,
    assigned_by: ctx.user!.user_id,
    status: 'Assigned',
    final_approval_status: 'Pending',
    rejection_reason: '',
    created_at: now,
    updated_at: now,
    completed_at: '',
  };

  await appendRow('Tasks', row);
  await auditLog(ctx.user, 'CREATE', 'Tasks', row.task_id, null, row, ctx.ip);
  return json(row, 201);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;

  const body = await req.json().catch(() => ({}));
  if (!body.task_id) return bad('task_id is required');

  const tasks = await getAllRows<any>('Tasks');
  const old = tasks.find(t => t.task_id === body.task_id);
  if (!old) return bad('Task not found');

  let patch: Record<string, unknown>;

  if (ctx.user!.role === 'EMPLOYEE') {
    if (old.assigned_to !== ctx.user!.employee_id) return forbid('Task is not assigned to you.');
    const allowed = ['In Progress', 'Ready for Review', 'Blocked'];
    if (!allowed.includes(body.status)) return forbid('Employees can only set status to: In Progress, Blocked, or Ready for Review.');
    patch = { status: body.status, updated_at: new Date().toISOString() };
  } else {
    // CEO
    const allowed = ['Assigned', 'In Progress', 'Ready for Review', 'Approved / Completed', 'Rejected', 'Blocked', 'Cancelled'];
    if (!allowed.includes(body.status)) return bad('Invalid task status.');
    if (body.status === 'Rejected' && !body.rejection_reason?.trim()) return bad('Rejection reason is required.');
    patch = {
      status: body.status,
      rejection_reason: body.rejection_reason || '',
      final_approval_status: body.status === 'Approved / Completed' ? 'Approved' : body.status === 'Rejected' ? 'Rejected' : old.final_approval_status,
      completed_at: body.status === 'Approved / Completed' ? new Date().toISOString() : old.completed_at,
      updated_at: new Date().toISOString(),
    };
  }

  const updated = await updateRowById('Tasks', 'task_id', body.task_id, patch);
  await auditLog(ctx.user, 'UPDATE', 'Tasks', body.task_id, old, updated, ctx.ip);
  return json(updated);
}
