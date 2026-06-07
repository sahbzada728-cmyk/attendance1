'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const STATUS_COLS = ['Assigned', 'In Progress', 'Blocked', 'Ready for Review', 'Rejected', 'Approved / Completed', 'Overdue', 'Cancelled'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent'];

export default function TasksPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(data => {
      setTasks(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, search]);

  async function updateStatus(taskId: string, status: string, rejection_reason?: string) {
    setUpdating(taskId); setMsg(null);
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, status, rejection_reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, ...data } : t));
      setMsg({ type: 'success', text: `Task updated to: ${status}` });
    } else {
      setMsg({ type: 'error', text: data.error || 'Update failed' });
    }
    setUpdating(null);
  }

  const today = new Date().toISOString().slice(0, 10);

  const counts = {
    total: tasks.length,
    active: tasks.filter(t => !['Approved / Completed', 'Cancelled'].includes(t.status)).length,
    overdue: tasks.filter(t => t.due_date && t.due_date < today && !['Approved / Completed', 'Cancelled'].includes(t.status)).length,
    pending: tasks.filter(t => t.status === 'Ready for Review').length,
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Tasks</h1>
          <p className="text-surface-500 text-sm mt-1">
            {counts.total} total · {counts.active} active · {counts.overdue > 0 && <span className="text-red-500 font-medium">{counts.overdue} overdue · </span>}{counts.pending} pending approval
          </p>
        </div>
        {isCeo && (
          <Link href="/tasks/new" className="btn-primary">+ Assign Task</Link>
        )}
      </div>

      {msg && (
        <div className={msg.type === 'success' ? 'alert-success alert' : 'alert-error alert'}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span> <span>{msg.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input w-60"
        />
        <select className="form-select w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUS_COLS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-select w-40" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => { setFilterStatus('All'); setFilterPriority('All'); setSearch(''); }} className="btn-secondary">Clear</button>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Assigned', 'In Progress', 'Blocked', 'Ready for Review', 'Overdue'].map(s => {
          const count = s === 'All' ? tasks.length : s === 'Overdue'
            ? tasks.filter(t => t.due_date && t.due_date < today && !['Approved / Completed', 'Cancelled'].includes(t.status)).length
            : tasks.filter(t => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filterStatus === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-600 border-surface-200 hover:border-brand-300'}`}
            >
              {s} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tasks table */}
      <div className="card">
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading tasks...</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-surface-500 text-sm">No tasks found matching your filters.</p>
            {isCeo && <Link href="/tasks/new" className="btn-primary mt-4 inline-flex">+ Assign First Task</Link>}
          </div>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isOverdue = t.due_date && t.due_date < today && !['Approved / Completed', 'Cancelled'].includes(t.status);
                  return (
                    <tr key={t.task_id} className={isOverdue ? 'bg-red-50/50' : ''}>
                      <td>
                        <Link href={`/tasks/${t.task_id}`} className="font-medium text-brand-700 hover:underline">
                          {t.title}
                        </Link>
                        {t.rejection_reason && (
                          <p className="text-xs text-red-500 mt-0.5">↳ Rejected: {t.rejection_reason}</p>
                        )}
                      </td>
                      <td className="text-xs text-surface-500">{t.assigned_to}</td>
                      <td><StatusBadge status={t.priority} /></td>
                      <td className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                        {t.due_date}{isOverdue && ' ⚠️'}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/tasks/${t.task_id}`} className="btn-ghost btn-sm">View</Link>
                          {isCeo && t.status === 'Ready for Review' && (
                            <>
                              <button
                                onClick={() => updateStatus(t.task_id, 'Approved / Completed')}
                                disabled={updating === t.task_id}
                                className="btn-success btn-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Rejection reason (required):');
                                  if (reason?.trim()) updateStatus(t.task_id, 'Rejected', reason);
                                }}
                                disabled={updating === t.task_id}
                                className="btn-danger btn-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {!isCeo && ['Assigned', 'In Progress', 'Blocked'].includes(t.status) && (
                            <select
                              className="text-xs border border-surface-200 rounded-lg px-2 py-1"
                              defaultValue=""
                              onChange={e => { if (e.target.value) updateStatus(t.task_id, e.target.value); e.target.value = ''; }}
                            >
                              <option value="" disabled>Update…</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Blocked">Blocked</option>
                              <option value="Ready for Review">Ready for Review</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
