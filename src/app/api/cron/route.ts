import { NextRequest, NextResponse } from 'next/server';
import { getAllRows } from '@/lib/sheets';
import { getSettings } from '@/lib/auth';
import { todayKey, attendanceWindow, progressWindow } from '@/lib/time';
import { sendEmail, ceoSummaryTemplate, progressReminderTemplate, attendanceReminderTemplate, commitmentReminderTemplate } from '@/lib/gmail';

function authCron(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ceo_summary';

  const settings = await getSettings();
  const tz = String(settings.timezone);
  const date = todayKey(tz);
  const employees = await getAllRows<any>('Employees');
  const activeEmployees = employees.filter(e => e.status === 'Active');

  if (type === 'attendance_reminder') {
    const win = attendanceWindow(settings);
    const attendance = await getAllRows<any>('Attendance');
    const todayAtt = attendance.filter(a => a.date === date);
    const marked = new Set(todayAtt.map(a => a.employee_id));

    for (const emp of activeEmployees) {
      if (!marked.has(emp.employee_id)) {
        try {
          await sendEmail(emp.email, 'Attendance Reminder – Mark Now Before Window Closes', attendanceReminderTemplate(emp.full_name, win.end));
        } catch (err) { console.error(`Attendance reminder failed for ${emp.email}:`, err); }
      }
    }
    return NextResponse.json({ ok: true, type });
  }

  if (type === 'commitment_reminder') {
    const commitments = await getAllRows<any>('Daily_Commitments');
    const submitted = new Set(commitments.filter(c => c.date === date).map(c => c.employee_id));
    for (const emp of activeEmployees) {
      if (!submitted.has(emp.employee_id)) {
        try {
          await sendEmail(emp.email, 'Daily Commitment Missing – Please Submit Now', commitmentReminderTemplate(emp.full_name));
        } catch (err) { console.error(`Commitment reminder failed for ${emp.email}:`, err); }
      }
    }
    return NextResponse.json({ ok: true, type });
  }

  if (type === 'progress_reminder') {
    const win = progressWindow(settings);
    for (const emp of activeEmployees) {
      try {
        await sendEmail(emp.email, 'Daily Progress Report Window Open – Submit Now', progressReminderTemplate(emp.full_name, `${win.start}–${win.end}`));
      } catch (err) { console.error(`Progress reminder failed for ${emp.email}:`, err); }
    }
    return NextResponse.json({ ok: true, type });
  }

  if (type === 'ceo_summary') {
    const attendance = await getAllRows<any>('Attendance');
    const commitments = await getAllRows<any>('Daily_Commitments');
    const tasks = await getAllRows<any>('Tasks');
    const progress = await getAllRows<any>('Daily_Task_Progress');

    const todayAtt = attendance.filter(a => a.date === date);
    const empMap = Object.fromEntries(activeEmployees.map(e => [e.employee_id, e.full_name]));

    const present = todayAtt.filter(a => a.status === 'Present').map(a => empMap[a.employee_id] || a.employee_id);
    const late = todayAtt.filter(a => a.status === 'Late').map(a => empMap[a.employee_id] || a.employee_id);
    const markedIds = new Set(todayAtt.map(a => a.employee_id));
    const absent = activeEmployees.filter(e => !markedIds.has(e.employee_id)).map(e => e.full_name);

    const todayCommits = new Set(commitments.filter(c => c.date === date).map(c => c.employee_id));
    const missingCommitment = activeEmployees.filter(e => !todayCommits.has(e.employee_id)).map(e => e.full_name);

    const todayProgress = progress.filter(p => p.date === date);
    const progressSet = new Set(todayProgress.map(p => p.employee_id));
    const submittedProgress = activeEmployees.filter(e => progressSet.has(e.employee_id)).map(e => e.full_name);
    const missingProgress = activeEmployees.filter(e => !progressSet.has(e.employee_id)).map(e => e.full_name);

    const activeTasks = tasks.filter(t => !['Approved / Completed', 'Cancelled'].includes(t.status));
    const tasksDueToday = activeTasks.filter(t => t.due_date === date).map(t => `${t.title} → ${empMap[t.assigned_to] || t.assigned_to}`);
    const overdueTasks = activeTasks.filter(t => t.due_date < date).map(t => `${t.title} (due ${t.due_date}) → ${empMap[t.assigned_to] || t.assigned_to}`);
    const pendingApproval = tasks.filter(t => t.status === 'Ready for Review').map(t => t.title);
    const blockedTasks = activeTasks.filter(t => t.status === 'Blocked').map(t => `${t.title} → ${empMap[t.assigned_to] || t.assigned_to}`);
    const noActivityTasks = todayProgress.filter(p => p.progress_status === 'No Activity Today').map(p => {
      const task = tasks.find(t => t.task_id === p.task_id);
      return `${task?.title || p.task_id} (${empMap[p.employee_id] || p.employee_id}): ${p.no_activity_reason}`;
    });

    const ceoEmail = process.env.CEO_SUPER_ADMIN_EMAIL || 'mjagrogroupe@gmail.com';
    const html = ceoSummaryTemplate({ date, present, late, absent, missingCommitment, submittedProgress, missingProgress, tasksDueToday, overdueTasks, pendingApproval, blockedTasks, noActivityTasks });

    try {
      await sendEmail(ceoEmail, `📊 End-of-Day Summary – ${date}`, html);
    } catch (err) {
      console.error('CEO summary email failed:', err);
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, type });
  }

  return NextResponse.json({ error: 'Unknown cron type' }, { status: 400 });
}
