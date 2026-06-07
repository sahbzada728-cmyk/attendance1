'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTaskPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';

  const [employees, setEmployees] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    department: '',
    priority: 'High',
    start_date: today,
    due_date: '',
    attachment_links: '',
  });

  useEffect(() => {
    if (!isCeo) return;
    fetch('/api/admin/employees').then(r => r.json()).then(data => {
      setEmployees(Array.isArray(data) ? data.filter((e: any) => e.status === 'Active') : []);
    });
  }, [isCeo]);

  if (!isCeo) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-xl font-bold font-display mb-2">CEO Only</h1>
        <p className="text-surface-500 text-sm mb-6">Only the CEO/Super Admin can assign tasks.</p>
        <Link href="/tasks" className="btn-secondary">← Back to Tasks</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError('');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/tasks/${data.task_id}`);
    } else {
      setError(data.error || 'Failed to create task');
      setSubmitting(false);
    }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="max-w-2xl fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/tasks" className="btn-ghost">← Tasks</Link>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Assign New Task</h1>
          <p className="text-surface-500 text-sm mt-0.5">Task will be assigned immediately. Employee will see it on their dashboard.</p>
        </div>
      </div>

      {error && (
        <div className="alert-error alert mb-6">
          <span>✗</span><span>{error}</span>
        </div>
      )}

      <div className="card card-body">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="form-label">Task Title <span className="text-red-500">*</span></label>
            <input type="text" className="form-input" value={form.title} onChange={f('title')} required placeholder="e.g., Prepare Q2 inventory report" />
          </div>

          <div>
            <label className="form-label">Description <span className="text-red-500">*</span></label>
            <textarea className="form-textarea" rows={4} value={form.description} onChange={f('description')} required placeholder="Detailed task description, requirements, and acceptance criteria..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Assign To <span className="text-red-500">*</span></label>
              <select className="form-select" value={form.assigned_to} onChange={f('assigned_to')} required>
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} — {e.role_position}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Department</label>
              <input type="text" className="form-input" value={form.department} onChange={f('department')} placeholder="e.g., Accounts & Admin" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Priority <span className="text-red-500">*</span></label>
              <select className="form-select" value={form.priority} onChange={f('priority')}>
                {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Start Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.start_date} onChange={f('start_date')} required />
            </div>
            <div>
              <label className="form-label">Due Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={form.due_date} onChange={f('due_date')} required min={form.start_date} />
            </div>
          </div>

          <div>
            <label className="form-label">Attachment / Google Drive Links</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={form.attachment_links}
              onChange={f('attachment_links')}
              placeholder="https://drive.google.com/... (one link per line)"
            />
            <p className="text-xs text-surface-400 mt-1">Paste Google Drive links to documents, spreadsheets, or folders relevant to this task.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary px-8">
              {submitting ? 'Assigning...' : '✓ Assign Task'}
            </button>
            <Link href="/tasks" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
