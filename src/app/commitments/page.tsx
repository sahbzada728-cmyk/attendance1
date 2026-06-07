'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);

export default function CommitmentsPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [commitments, setCommitments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ planned_task: '', expected_output: '', priority: 'High', estimated_completion_time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/commitments').then(r => r.json()).then(setCommitments).finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg(null);
    const res = await fetch('/api/commitments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: 'Daily commitment submitted successfully!' });
      setCommitments(prev => [data, ...prev]);
      setForm({ planned_task: '', expected_output: '', priority: 'High', estimated_completion_time: '', notes: '' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Submission failed' });
    }
    setSubmitting(false);
  }

  const todayCommitment = commitments.find(c => c.date === today);

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Daily Commitment</h1>
        <p className="text-surface-500 text-sm mt-1">Submit your planned work for today. Every employee must submit one commitment per working day.</p>
      </div>

      {msg && (
        <div className={msg.type === 'success' ? 'alert-success alert' : 'alert-error alert'}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Form (employees only, unless not yet submitted) */}
      {!isCeo && !todayCommitment && (
        <div className="card card-body max-w-2xl">
          <h2 className="font-semibold font-display mb-4">Today's Commitment — {today}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="form-label">Main Planned Work <span className="text-red-500">*</span></label>
              <textarea className="form-textarea" rows={3} required value={form.planned_task} onChange={e => setForm(p => ({ ...p, planned_task: e.target.value }))} placeholder="Describe the main work you plan to complete today..." />
            </div>
            <div>
              <label className="form-label">Expected Output <span className="text-red-500">*</span></label>
              <textarea className="form-textarea" rows={2} required value={form.expected_output} onChange={e => setForm(p => ({ ...p, expected_output: e.target.value }))} placeholder="What will you have completed by end of day?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Estimated Completion Time</label>
                <input type="time" className="form-input" value={form.estimated_completion_time} onChange={e => setForm(p => ({ ...p, estimated_completion_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="form-label">Notes / Comments</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional context or dependencies..." />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : '✓ Submit Daily Commitment'}
            </button>
          </form>
        </div>
      )}

      {!isCeo && todayCommitment && (
        <div className="alert-success alert max-w-2xl">
          <span>✓</span>
          <div>
            <p className="font-medium">Commitment submitted for today</p>
            <p className="text-sm">{todayCommitment.planned_task}</p>
          </div>
        </div>
      )}

      {/* Records */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold font-display">Commitment Records</h3>
          <span className="badge badge-blue">{commitments.length}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading...</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Planned Task</th>
                  <th>Expected Output</th>
                  <th>Est. Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...commitments].reverse().map(c => (
                  <tr key={c.commitment_id}>
                    <td className="text-xs">{c.employee_id}</td>
                    <td>{c.date}</td>
                    <td><StatusBadge status={c.priority} /></td>
                    <td className="max-w-xs truncate">{c.planned_task}</td>
                    <td className="max-w-xs truncate">{c.expected_output}</td>
                    <td>{c.estimated_completion_time || '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
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
