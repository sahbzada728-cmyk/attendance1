import { NextRequest } from 'next/server';
import { requireUser, json, bad, forbid, auditLog } from '@/lib/api';
import { getAllRows, appendRow, updateRowById, makeId } from '@/lib/sheets';
import { subtaskSchema, commentSchema } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;

  const taskId = params.id;
  const tasks = await getAllRows<any>('Tasks');
  const task = tasks.find(t => t.task_id === taskId);
  if (!task) return bad('Task not found');
  if (ctx.user!.role === 'EMPLOYEE' && task.assigned_to !== ctx.user!.employee_id) return forbid();

  const subtasks = (await getAllRows<any>('Subtasks')).filter(s => s.task_id === taskId);
  const comments = (await getAllRows<any>('Comments')).filter(c => c.task_id === taskId);
  const progress = (await getAllRows<any>('Daily_Task_Progress')).filter(p => p.task_id === taskId);

  return json({ task, subtasks, comments, progress });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;

  const taskId = params.id;
  const body = await req.json().catch(() => ({}));
  const { type } = body;

  if (type === 'subtask') {
    if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid('Only CEO can create subtasks.');
    const parsed = subtaskSchema.safeParse({ ...body, task_id: taskId });
    if (!parsed.success) return bad(parsed.error.issues.map((i: any) => i.message).join(', '));
    const now = new Date().toISOString();
    const row = { subtask_id: makeId('sub'), ...parsed.data, created_at: now, updated_at: now };
    await appendRow('Subtasks', row);
    await auditLog(ctx.user, 'CREATE', 'Subtasks', row.subtask_id, null, row, ctx.ip);
    return json(row, 201);
  }

  if (type === 'comment') {
    const parsed = commentSchema.safeParse({ ...body, task_id: taskId });
    if (!parsed.success) return bad(parsed.error.issues.map((i: any) => i.message).join(', '));
    const now = new Date().toISOString();
    const row = {
      comment_id: makeId('cmt'),
      task_id: taskId,
      subtask_id: parsed.data.subtask_id || '',
      user_id: ctx.user!.user_id,
      user_role: ctx.user!.role,
      comment_text: parsed.data.comment_text,
      edited: false,
      edit_history: '',
      created_at: now,
      updated_at: now,
    };
    await appendRow('Comments', row);
    return json(row, 201);
  }

  return bad('Invalid type. Use "subtask" or "comment".');
}
