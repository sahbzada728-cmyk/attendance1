import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, getSettings } from '@/lib/auth';
import { getAllRows } from '@/lib/sheets';
import { todayKey, attendanceWindow, progressWindow } from '@/lib/time';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

async function getDashboardData(role: string, employeeId: string) {
  const settings = await getSettings();
  const tz = String(settings.timezone);
  const date = todayKey(tz);
  const win = attendanceWindow(settings);
  const pwin = progressWindow(settings);

  let employees: any[] = [], attendance: any[] = [], commitments: any[] = [], tasks: any[] = [], progress: any[] = [];

  try {
    [employees, attendance, commitments, tasks, progress] = await Promise.all([
      getAllRows<any>('Employees'),
      getAllRows<any>('Attendance'),
      getAllRows<any>('Daily_Commitments'),
      getAllRows<any>('Tasks'),
      getAllRows<any>('Daily_Task_Progress'),
    ]);
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
  }

  const activeEmp = employees.filter(e => e.status === 'Active');
  const todayAtt = attendance.filter(a => a.date === date);
  const todayCommits = commitments.filter(c => c.date === date);
  const todayProgress = progress.filter(p => p.date === date);

  if (role === 'CEO_SUPER_ADMIN') {
    const present = todayAtt.filter(a => a.status === 'Present');
    const late = todayAtt.filter(a => a.status === 'Late');
    const markedIds = new Set(todayAtt.map(a => a.employee_id));
    const absent = activeEmp.filter(e => !markedIds.has(e.employee_id));
    const commitSubmitted = new Set(todayCommits.map(c => c.employee_id));
    const missingCommit = activeEmp.filter(e => !commitSubmitted.has(e.employee_id));
    const progressSet = new Set(todayProgress.map(p => p.employee_id));
    const missingProgress = activeEmp.filter(e => !progressSet.has(e.employee_id));

    const activeTasks = tasks.filter(t => !['Approved / Completed', 'Cancelled'].includes(t.status));
    const overdue = activeTasks.filter(t => t.due_date && t.due_date < date);
    const dueToday = activeTasks.filter(t => t.due_date === date);
    const pendingApproval = tasks.filter(t => t.status === 'Ready for Review');
    const blocked = activeTasks.filter(t => t.status === 'Blocked');
    const noActivity = todayProgress.filter(p => p.progress_status === 'No Activity Today');

    return {
      role, date, win, pwin, settings,
      stats: {
        present: present.length, late: late.length, absent: absent.length,
        missingCommit: missingCommit.length, missingProgress: missingProgress.length,
        overdue: overdue.length, dueToday: dueToday.length, pendingApproval: pendingApproval.length,
        blocked: blocked.length, noActivity: noActivity.length,
      },
      activeEmp, todayAtt, missingCommit, missingProgress, overdue, dueToday, pendingApproval, blocked, noActivity,
      empMap: Object.fromEntries(employees.map(e => [e.employee_id, e.full_name])),
    };
  }

  // Employee view
  const myTasks = tasks.filter(t => t.assigned_to === employeeId && !['Approved / Completed', 'Cancelled'].includes(t.status));
  const myTodayAtt = todayAtt.find(a => a.employee_id === employeeId);
  const myCommit = todayCommits.find(c => c.employee_id === employeeId);
  const myProgress = todayProgress.filter(p => p.employee_id === employeeId);

  return { role, date, win, pwin, settings, myTasks, myTodayAtt, myCommit, myProgress, employeeId };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const role = session.user?.role as string;
  const employeeId = (session.user as any)?.employee_id || '';
  const data = await getDashboardData(role, employeeId);

  if (role === 'CEO_SUPER_ADMIN') {
    return <CeoDashboard data={data as any} />;
  }
  return <EmployeeDashboard data={data as any} />;
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const card = (
    <div className={`stat-card border-l-4 ${color} hover:shadow-md transition-shadow`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function CeoDashboard({ data }: { data: any }) {
  const s = data.stats;
  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">CEO Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Today: {data.date} · Office {data.win.start}–{data.pwin.end} PKT</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Present" value={s.present} color="border-emerald-400" />
        <StatCard label="Late" value={s.late} color="border-amber-400" />
        <StatCard label="Absent / No Entry" value={s.absent} color="border-red-400" />
        <StatCard label="Missing Commitment" value={s.missingCommit} color="border-orange-400" />
        <StatCard label="Missing Progress" value={s.missingProgress} color="border-red-500" />
        <StatCard label="Due Today" value={s.dueToday} color="border-blue-400" href="/tasks" />
        <StatCard label="Overdue" value={s.overdue} color="border-red-600" href="/tasks" />
        <StatCard label="Pending Approval" value={s.pendingApproval} color="border-purple-400" href="/tasks" />
        <StatCard label="Blocked" value={s.blocked} color="border-orange-500" href="/tasks" />
        <StatCard label="No Activity Today" value={s.noActivity} color="border-gray-400" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/tasks/new" className="btn-primary">+ Assign Task</Link>
        <Link href="/admin/employees" className="btn-secondary">+ Add Employee</Link>
        <Link href="/attendance" className="btn-secondary">Override Attendance</Link>
        <Link href="/admin/settings" className="btn-secondary">⚙ Office Settings</Link>
        <Link href="/reports" className="btn-secondary">📈 Export Reports</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display text-surface-900">Pending Approval</h3>
            <span className="badge badge-purple">{data.pendingApproval.length}</span>
          </div>
          <div className="divide-y divide-surface-100">
            {data.pendingApproval.length === 0 ? (
              <p className="p-4 text-sm text-surface-400">No tasks awaiting approval.</p>
            ) : data.pendingApproval.map((t: any) => (
              <div key={t.task_id} className="p-4 flex items-center justify-between hover:bg-surface-50">
                <div>
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-surface-400">{data.empMap[t.assigned_to] || t.assigned_to} · Due {t.due_date}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/tasks/${t.task_id}`} className="btn-primary btn-sm">Review</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Attendance */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display text-surface-900">Today's Attendance</h3>
          </div>
          <div className="divide-y divide-surface-100">
            {data.todayAtt.length === 0 ? (
              <p className="p-4 text-sm text-surface-400">No attendance recorded yet.</p>
            ) : data.todayAtt.map((a: any) => (
              <div key={a.attendance_id} className="p-4 flex items-center justify-between">
                <p className="text-sm font-medium">{data.empMap[a.employee_id] || a.employee_id}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400">{a.time_in}</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        {data.overdue.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold font-display text-surface-900">Overdue Tasks</h3>
              <span className="badge badge-red">{data.overdue.length}</span>
            </div>
            <div className="divide-y divide-surface-100">
              {data.overdue.map((t: any) => (
                <div key={t.task_id} className="p-4 flex items-center justify-between hover:bg-surface-50">
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-surface-400">{data.empMap[t.assigned_to] || t.assigned_to} · Due {t.due_date}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Commitment */}
        {data.missingCommit.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold font-display text-surface-900">Missing Daily Commitment</h3>
              <span className="badge badge-orange">{data.missingCommit.length}</span>
            </div>
            <div className="divide-y divide-surface-100">
              {data.missingCommit.map((e: any) => (
                <div key={e.employee_id} className="p-4 flex items-center justify-between">
                  <p className="text-sm font-medium">{e.full_name}</p>
                  <StatusBadge status="No Entry" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDashboard({ data }: { data: any }) {
  const { myTasks, myTodayAtt, myCommit, myProgress, date, win, pwin } = data;

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">My Dashboard</h1>
        <p className="text-surface-500 text-sm mt-1">Today: {date} · Attendance: {win.start}–{win.end} · Progress: {pwin.start}–{pwin.end} PKT</p>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-emerald-400">
          <span className="stat-value text-xl">{myTodayAtt ? myTodayAtt.status : 'Not marked'}</span>
          <span className="stat-label">Attendance</span>
          {!myTodayAtt && <Link href="/attendance" className="btn-primary btn-sm mt-2 self-start">Mark Now</Link>}
        </div>
        <div className="stat-card border-l-4 border-blue-400">
          <span className="stat-value text-xl">{myCommit ? 'Submitted' : 'Pending'}</span>
          <span className="stat-label">Daily Commitment</span>
          {!myCommit && <Link href="/commitments" className="btn-primary btn-sm mt-2 self-start">Submit Now</Link>}
        </div>
        <div className="stat-card border-l-4 border-purple-400">
          <span className="stat-value">{myProgress.length}</span>
          <span className="stat-label">Progress Submitted</span>
          <Link href="/progress" className="btn-secondary btn-sm mt-2 self-start">View Progress</Link>
        </div>
      </div>

      {/* My Tasks */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold font-display text-surface-900">My Active Tasks</h3>
          <span className="badge badge-blue">{myTasks.length}</span>
        </div>
        {myTasks.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No active tasks assigned to you.</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map((t: any) => (
                  <tr key={t.task_id}>
                    <td className="font-medium">{t.title}</td>
                    <td><StatusBadge status={t.priority} /></td>
                    <td className={t.due_date < date ? 'text-red-600 font-medium' : ''}>{t.due_date}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><Link href={`/tasks/${t.task_id}`} className="btn-ghost btn-sm">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
