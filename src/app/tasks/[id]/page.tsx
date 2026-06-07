'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function TaskDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const myEmployeeId = (session?.user as any)?.employee_id || '';

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Comment form
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Status update
  const [updating, setUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Subtask form (CEO)
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [subtaskForm, setSubtaskForm] = useState({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Assigned', progress_percent: 0 });

  useEffect(() => {
    loadTask();
    if (isCeo) {
      fetch('/api/admin/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));
    }
  }, [taskId, isCeo]);

  async function loadTask() {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data.task);
      setSubtasks(data.subtasks || []);
      setComments(data.comments || []);
      setProgress(data.progress || []);
    }
    setLoading(false);
  }

  async function updateStatus(status: string, rejection_reason?: string) {
    setUpdating(true); setMsg(null);
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, status, rejection_reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setTask((prev: any) => ({ ...prev, ...data }));
      setMsg({ type: 'success', text: `Status updated to: ${status}` });
      setShowRejectForm(false);
      setRejectionReason('');
    } else {
      setMsg({ type: 'error', text: data.error || 'Update failed' });
    }
    setUpdating(false);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'comment', comment_text: comment }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments(prev => [...prev, data]);
      setComment('');
    } else {
      setMsg({ type: 'error', text: data.error || 'Comment failed' });
    }
    setPostingComment(false);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subtask', ...subtaskForm }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubtasks(prev => [...prev, data]);
      setShowSubtaskForm(false);
      setSubtaskForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Assigned', progress_percent: 0 });
    } else {
      setMsg({ type: 'error', text: data.error || 'Subtask creation failed' });
    }
  }

  if (loading) return <div className="p-8 text-surface-400 text-sm">Loading task...</div>;
  if (!task) return <div className="p-8"><p className="text-red-500">Task not found.</p><Link href="/tasks" className="btn-secondary mt-4 inline-flex">← Back</Link></div>;

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.due_date && task.due_date < today && !['Approved / Completed', 'Cancelled'].includes(task.status);
  const isMyTask = task.assigned_to === myEmployeeId;

  return (
    <div className="max-w-4xl fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link href="/tasks" className="btn-ghost mt-1">←</Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <StatusBadge status={task.priority} />
              <StatusBadge status={task.status} />
              {isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
            </div>
            <h1 className="text-2xl font-bold text-surface-900 font-display">{task.title}</h1>
            <p className="text-surface-500 text-sm mt-1">
              Assigned to: <span className="font-medium">{task.assigned_to}</span> ·
              Due: <span className={isOverdue ? 'text-red-600 font-semibold' : 'font-medium'}>{task.due_date}</span> ·
              Created: {task.created_at?.slice(0, 10)}
            </p>
          </div>
        </div>

        {/* CEO action buttons */}
        {isCeo && task.status === 'Ready for Review' && !showRejectForm && (
          <div className="flex gap-2">
            <button onClick={() => updateStatus('Approved / Completed')} disabled={updating} className="btn-success">
              ✓ Approve
            </button>
            <button onClick={() => setShowRejectForm(true)} className="btn-danger">
              ✗ Reject
            </button>
          </div>
        )}

        {/* Employee: Ready for Review button */}
        {!isCeo && isMyTask && task.status === 'In Progress' && (
          <button onClick={() => updateStatus('Ready for Review')} disabled={updating} className="btn-primary">
            → Mark Ready for Review
          </button>
        )}
      </div>

      {msg && (
        <div className={`${msg.type === 'success' ? 'alert-success' : 'alert-error'} alert mb-6`}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span><span>{msg.text}</span>
        </div>
      )}

      {/* Rejection form */}
      {showRejectForm && (
        <div className="card card-body mb-6 border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-3">Reject Task — Reason Required</h3>
          <textarea
            className="form-textarea border-red-300"
            rows={3}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Explain why this task is being rejected and what needs to be done..."
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { if (rejectionReason.trim()) updateStatus('Rejected', rejectionReason); }}
              disabled={!rejectionReason.trim() || updating}
              className="btn-danger"
            >
              Confirm Rejection
            </button>
            <button onClick={() => { setShowRejectForm(false); setRejectionReason(''); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rejection notice */}
      {task.status === 'Rejected' && task.rejection_reason && (
        <div className="alert-error alert mb-6">
          <span>✗</span>
          <div>
            <p className="font-medium">Task Rejected</p>
            <p className="text-sm">{task.rejection_reason}</p>
            {!isCeo && isMyTask && (
              <button onClick={() => updateStatus('In Progress')} className="btn-secondary btn-sm mt-2">
                Resume — Back to In Progress
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="card card-body">
            <h3 className="font-semibold font-display mb-3">Description</h3>
            <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{task.description || 'No description provided.'}</p>
            {task.attachment_links && (
              <div className="mt-4 pt-4 border-t border-surface-100">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Attachments</p>
                {task.attachment_links.split('\n').filter(Boolean).map((link: string, i: number) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-sm text-brand-600 hover:underline truncate">
                    📎 {link}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Progress history */}
          {progress.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold font-display">Progress History</h3>
                <span className="badge badge-blue">{progress.length}</span>
              </div>
              <div className="divide-y divide-surface-100">
                {[...progress].reverse().map(p => (
                  <div key={p.progress_id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <StatusBadge status={p.progress_status} />
                      <span className="text-xs text-surface-400">{p.date} · {p.submitted_at?.slice(11, 16)}</span>
                    </div>
                    {p.progress_description && <p className="text-sm text-surface-700 mt-1">{p.progress_description}</p>}
                    {p.no_activity_reason && <p className="text-sm text-amber-700 mt-1">No activity reason: {p.no_activity_reason}</p>}
                    {p.blocker_reason && <p className="text-sm text-red-700 mt-1">Blocker: {p.blocker_reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold font-display">Comments</h3>
              <span className="badge badge-blue">{comments.length}</span>
            </div>
            <div className="divide-y divide-surface-100">
              {comments.length === 0 ? (
                <p className="p-4 text-sm text-surface-400">No comments yet. Be the first.</p>
              ) : [...comments].reverse().map(c => (
                <div key={c.comment_id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${c.user_role === 'CEO_SUPER_ADMIN' ? 'badge-purple' : 'badge-blue'} text-xs`}>
                      {c.user_role === 'CEO_SUPER_ADMIN' ? '👑 CEO' : '👤 Employee'}
                    </span>
                    <span className="text-xs text-surface-400">{c.created_at?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <p className="text-sm text-surface-700 whitespace-pre-wrap">{c.comment_text}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-surface-100">
              <form onSubmit={postComment} className="flex gap-3">
                <textarea
                  className="form-textarea flex-1"
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..."
                />
                <button type="submit" disabled={postingComment || !comment.trim()} className="btn-primary self-end">
                  {postingComment ? '...' : 'Post'}
                </button>
              </form>
            </div>
          </div>
        </div>

      {/* Sidebar: details + subtasks */}
<div className="space-y-4">
  {/* Task meta */}
  <div className="card card-body">
    <h3 className="font-semibold font-display mb-3 text-sm">Task Details</h3>
    <dl className="space-y-2 text-sm">
      {([
        ['Department', task.department || '—'],
        ['Start Date', task.start_date],
        ['Due Date', task.due_date],
        ['Approval', task.final_approval_status || 'Pending'],
        ['Updated', task.updated_at?.slice(0, 10)],
        task.completed_at ? ['Completed', task.completed_at?.slice(0, 10)] : null,
      ] as ([string, string] | null)[])
        .filter((p): p is [string, string] => p !== null)
        .map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-surface-500">{k}</dt>
            <dd className="font-medium text-right">{v}</dd>
          </div>
        ))}
    </dl>
  </div>
          {/* Employee quick-update */}
          {!isCeo && isMyTask && !['Approved / Completed', 'Cancelled', 'Ready for Review'].includes(task.status) && (
            <div className="card card-body">
              <h3 className="font-semibold font-display mb-3 text-sm">Update Status</h3>
              <div className="space-y-2">
                {['In Progress', 'Blocked', 'Ready for Review'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updating || task.status === s}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${task.status === s ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium' : 'border-surface-200 hover:border-brand-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold font-display text-sm">Subtasks</h3>
              {isCeo && (
                <button onClick={() => setShowSubtaskForm(!showSubtaskForm)} className="btn-ghost btn-sm">
                  {showSubtaskForm ? 'Cancel' : '+ Add'}
                </button>
              )}
            </div>

            {showSubtaskForm && (
              <div className="p-4 border-b border-surface-100 bg-surface-50">
                <form onSubmit={addSubtask} className="space-y-3">
                  <input className="form-input text-sm" placeholder="Subtask title" value={subtaskForm.title} onChange={e => setSubtaskForm(p => ({ ...p, title: e.target.value }))} required />
                  <select className="form-select text-sm" value={subtaskForm.assigned_to} onChange={e => setSubtaskForm(p => ({ ...p, assigned_to: e.target.value }))} required>
                    <option value="">Assign to...</option>
                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
                  </select>
                  <input type="date" className="form-input text-sm" value={subtaskForm.due_date} onChange={e => setSubtaskForm(p => ({ ...p, due_date: e.target.value }))} required />
                  <select className="form-select text-sm" value={subtaskForm.priority} onChange={e => setSubtaskForm(p => ({ ...p, priority: e.target.value }))}>
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                  </select>
                  <button type="submit" className="btn-primary btn-sm w-full">Add Subtask</button>
                </form>
              </div>
            )}

            <div className="divide-y divide-surface-100">
              {subtasks.length === 0 ? (
                <p className="p-4 text-xs text-surface-400">No subtasks.</p>
              ) : subtasks.map(s => (
                <div key={s.subtask_id} className="p-3">
                  <p className="text-sm font-medium">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-surface-400">Due {s.due_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
