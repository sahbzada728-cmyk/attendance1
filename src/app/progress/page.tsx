'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);

function TimeWindow({ start, end }: { start: string; end: string }) {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const nowMin = toMin(now);
  const isOpen = now && nowMin >= toMin(start) && nowMin <= toMin(end);
  const isBefore = now && nowMin < toMin(start);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isOpen ? 'bg-emerald-100 text-emerald-700' : isBefore ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 pulse-dot' : isBefore ? 'bg-amber-400' : 'bg-surface-400'}`} />
      {isOpen ? `Window Open · ${start}–${end}` : isBefore ? `Opens at ${start}` : `Closed · ${end} passed`}
      {now && <span className="opacity-60 text-xs">· Now {now}</span>}
    </div>
  );
}

export default function ProgressPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const myId = (session?.user as any)?.employee_id || '';

  const [tasks, setTasks] = useState<any[]>([]);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Per-task progress forms
  const [forms, setForms] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [tasksRes, progressRes, settingsRes] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/progress').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setProgressRecords(Array.isArray(progressRes) ? progressRes : []);
      setSettings(settingsRes);
      setLoading(false);
    };
    load();
  }, []);

  const activeTasks = tasks.filter(t =>
    !['Approved / Completed', 'Cancelled'].includes(t.status) &&
    (isCeo ? true : t.assigned_to === myId)
  );

  const todayProgress = progressRecords.filter(p => p.date === today);
  const submittedTaskIds = new Set(todayProgress.map(p => p.task_id));

  const pendingTasks = activeTasks.filter(t => !submittedTaskIds.has(t.task_id));

  const progressWindow = settings ? (() => {
    const end = String(settings.office_end_time || '19:00');
    const windowMin = Number(settings.progress_report_window_minutes || 30);
    const [eh, em] = end.split(':').map(Number);
    const startMin = eh * 60 + em - windowMin;
    const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
    return { start, end };
  })() : { start: '18:30', end: '19:00' };

  function setForm(taskId: string, field: string, value: string) {
    setForms(prev => ({ ...prev, [taskId]: { ...(prev[taskId] || {}), [field]: value } }));
  }

  async function submitProgress(taskId: string) {
    const form = forms[taskId] || {};
    if (!form.progress_status) {
      setMsg({ type: 'error', text: 'Select a progress status first.' });
      return;
    }
    setSubmitting(taskId); setMsg(null);
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, ...form }),
    });
    const data = await res.json();
    if (res.ok) {
      setProgressRecords(prev => [...prev, data]);
      setForms(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      setMsg({ type: 'success', text: 'Progress submitted!' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Submission failed' });
    }
    setSubmitting(null);
  }

  if (loading) return <div className="p-8 text-surface-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Daily Progress Report</h1>
          <p className="text-surface-500 text-sm mt-1">Submit progress for every active assigned task during the reporting window.</p>
        </div>
        <TimeWindow start={progressWindow.start} end={progressWindow.end} />
      </div>

      {msg && (
        <div className={`${msg.type === 'success' ? 'alert-success' : 'alert-error'} alert`}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span><span>{msg.text}</span>
        </div>
      )}

      {!isCeo && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card border-l-4 border-blue-400">
              <span className="stat-value">{activeTasks.length}</span>
              <span className="stat-label">Active Tasks</span>
            </div>
            <div className="stat-card border-l-4 border-emerald-400">
              <span className="stat-value">{todayProgress.length}</span>
              <span className="stat-label">Submitted Today</span>
            </div>
            <div className="stat-card border-l-4 border-amber-400">
              <span className="stat-value">{pendingTasks.length}</span>
              <span className="stat-label">Pending Submission</span>
            </div>
          </div>

          {pendingTasks.length === 0 && activeTasks.length > 0 && (
            <div className="alert-success alert">
              <span>✓</span>
              <span>All progress reports submitted for today! Great work.</span>
            </div>
          )}

          {activeTasks.length === 0 && (
            <div className="alert-info alert">
              <span>ℹ</span>
              <span>No active tasks assigned to you. Ask the CEO to assign tasks.</span>
            </div>
          )}

          {/* Pending progress forms */}
          {pendingTasks.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold font-display text-surface-900">Tasks Pending Progress — {today}</h2>
              {pendingTasks.map(task => {
                const form = forms[task.task_id] || {};
                const isOver = today > task.due_date;
                return (
                  <div key={task.task_id} className="card card-body">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold font-display">{task.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <StatusBadge status={task.priority} />
                          <StatusBadge status={task.status} />
                          {isOver && <span className="badge badge-red">Overdue</span>}
                          <span className="text-xs text-surface-400">Due {task.due_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Progress Status <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {['Work Done', 'In Progress', 'No Activity Today', 'Blocked', 'Ready for Review'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setForm(task.task_id, 'progress_status', s)}
                              className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${form.progress_status === s ? 'bg-brand-600 text-white border-brand-600' : 'border-surface-200 hover:border-brand-300'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Progress Description</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={form.progress_description || ''}
                          onChange={e => setForm(task.task_id, 'progress_description', e.target.value)}
                          placeholder="What did you do / what is in progress?"
                        />
                      </div>

                      {form.progress_status === 'No Activity Today' && (
                        <div>
                          <label className="form-label text-amber-700">No Activity Reason <span className="text-red-500">*</span></label>
                          <textarea
                            className="form-textarea border-amber-300"
                            rows={2}
                            value={form.no_activity_reason || ''}
                            onChange={e => setForm(task.task_id, 'no_activity_reason', e.target.value)}
                            placeholder="Required: Explain why no work was done on this task today..."
                            autoFocus
                          />
                        </div>
                      )}

                      {form.progress_status === 'Blocked' && (
                        <div>
                          <label className="form-label text-red-700">Blocker Reason <span className="text-red-500">*</span></label>
                          <textarea
                            className="form-textarea border-red-300"
                            rows={2}
                            value={form.blocker_reason || ''}
                            onChange={e => setForm(task.task_id, 'blocker_reason', e.target.value)}
                            placeholder="Required: Describe what is blocking this task and what help is needed..."
                            autoFocus
                          />
                        </div>
                      )}

                      <button
                        onClick={() => submitProgress(task.task_id)}
                        disabled={submitting === task.task_id || !form.progress_status}
                        className="btn-primary"
                      >
                        {submitting === task.task_id ? 'Submitting...' : '✓ Submit Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Already submitted today */}
          {todayProgress.length > 0 && (
            <div>
              <h2 className="font-semibold font-display text-surface-900 mb-4">Submitted Today</h2>
              <div className="space-y-3">
                {todayProgress.map(p => {
                  const task = tasks.find(t => t.task_id === p.task_id);
                  return (
                    <div key={p.progress_id} className="card card-body flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{task?.title || p.task_id}</p>
                        {p.progress_description && <p className="text-xs text-surface-500 mt-0.5">{p.progress_description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={p.progress_status} />
                        <span className="text-xs text-surface-400">{p.submitted_at?.slice(11, 16)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* CEO view — all progress */}
      {isCeo && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display">All Progress Records — {today}</h3>
            <span className="badge badge-blue">{todayProgress.length}</span>
          </div>
          {todayProgress.length === 0 ? (
            <p className="p-6 text-sm text-surface-400">No progress submitted yet for today.</p>
          ) : (
            <div className="table-container rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>No Activity / Blocker Reason</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {todayProgress.map(p => {
                    const task = tasks.find(t => t.task_id === p.task_id);
                    return (
                      <tr key={p.progress_id}>
                        <td className="font-medium">{task?.title || p.task_id}</td>
                        <td className="text-xs">{p.employee_id}</td>
                        <td><StatusBadge status={p.progress_status} /></td>
                        <td className="max-w-xs truncate text-xs">{p.progress_description || '—'}</td>
                        <td className="max-w-xs truncate text-xs text-amber-700">{p.no_activity_reason || p.blocker_reason || '—'}</td>
                        <td className="text-xs">{p.submitted_at?.slice(11, 16)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
