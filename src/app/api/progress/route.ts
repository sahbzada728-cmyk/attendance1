import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { isWithinWindow, nowTime, progressWindow, todayKey } from '@/lib/time';
import { isWorkingDay } from '@/lib/business';
import { progressSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  const rows = await getAllRows<any>('Daily_Task_Progress');
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  let data = ctx.user!.role === 'CEO_SUPER_ADMIN' ? rows : rows.filter(r => r.employee_id === ctx.user!.employee_id);
  if (date) data = data.filter(r => r.date === date);
  return json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'EMPLOYEE') return forbid('Only employees submit progress reports.');

  const date = todayKey(String(ctx.settings.timezone));
  if (!(await isWorkingDay(date))) return bad('Progress report not required on Sunday/public holidays.');

  const win = progressWindow(ctx.settings);
  const t = nowTime(String(ctx.settings.timezone));
  const within = isWithinWindow(t, win.start, win.end);
  if (!within) return bad(`Daily progress can be submitted only from ${win.start} to ${win.end} (current time: ${t}).`);

  const body = await req.json().catch(() => ({}));
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues.map(i => i.message).join(', '));

  const tasks = await getAllRows<any>('Tasks');
  const task = tasks.find(x => x.task_id === parsed.data.task_id);
  if (!task) return bad('Task not found.');
  if (task.assigned_to !== ctx.user!.employee_id) return forbid('Task is not assigned to you.');
  if (['Approved / Completed', 'Cancelled'].includes(task.status)) return bad('Cannot submit progress for a completed/cancelled task.');

  const existing = (await getAllRows<any>('Daily_Task_Progress')).find(
    p => p.task_id === parsed.data.task_id && p.employee_id === ctx.user!.employee_id && p.date === date
  );
  if (existing) return bad('Progress already submitted for this task today.');

  const row = {
    progress_id: makeId('prog'),
    ...parsed.data,
    employee_id: ctx.user!.employee_id,
    date,
    submitted_at: new Date().toISOString(),
    submitted_ip: ctx.ip,
    submitted_device: req.headers.get('user-agent') || '',
    is_within_allowed_window: true,
    created_at: new Date().toISOString(),
  };

  await appendRow('Daily_Task_Progress', row);

  // Auto-update task status based on progress
  if (parsed.data.progress_status === 'Ready for Review') {
    await updateRowById('Tasks', 'task_id', parsed.data.task_id, { status: 'Ready for Review', updated_at: new Date().toISOString() });
  } else if (parsed.data.progress_status === 'Blocked') {
    await updateRowById('Tasks', 'task_id', parsed.data.task_id, { status: 'Blocked', updated_at: new Date().toISOString() });
  } else if (parsed.data.progress_status === 'In Progress' && task.status === 'Assigned') {
    await updateRowById('Tasks', 'task_id', parsed.data.task_id, { status: 'In Progress', updated_at: new Date().toISOString() });
  }

  await auditLog(ctx.user, 'CREATE', 'Daily_Task_Progress', row.progress_id, null, row, ctx.ip, row.submitted_device);
  return json(row, 201);
}
