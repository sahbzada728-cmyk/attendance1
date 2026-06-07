'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

export default function AttendancePage() {
  const { data: session } = useSession();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Override form (CEO only)
  const [override, setOverride] = useState({ employee_id: '', date: new Date().toISOString().slice(0, 10), status: 'Present' as any, override_reason: '' });
  const [employees, setEmployees] = useState<any[]>([]);
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';

  useEffect(() => {
    fetch('/api/attendance').then(r => r.json()).then(setAttendance).finally(() => setLoading(false));
    if (isCeo) fetch('/api/admin/employees').then(r => r.json()).then(setEmployees);
  }, [isCeo]);

  async function markAttendance() {
    setMarking(true); setMsg(null);
    const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Attendance marked: ${data.status} at ${data.time_in}` });
      setAttendance(prev => [...prev, data]);
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to mark attendance' });
    }
    setMarking(false);
  }

  async function submitOverride(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const res = await fetch('/api/attendance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(override) });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Override saved for employee.` });
      setAttendance(prev => [...prev, data]);
    } else {
      setMsg({ type: 'error', text: data.error || 'Override failed' });
    }
  }

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Attendance</h1>
        <p className="text-surface-500 text-sm mt-1">Morning attendance window: 11:00–11:20 PKT (configurable)</p>
      </div>

      {msg && (
        <div className={msg.type === 'success' ? 'alert-success alert' : 'alert-error alert'}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Employee mark button */}
      {!isCeo && (
        <div className="card card-body max-w-md">
          <h2 className="font-semibold font-display mb-4">Mark Your Attendance</h2>
          <p className="text-sm text-surface-500 mb-4">Attendance can only be marked during the allowed window (11:00–11:20 by default). You can only mark attendance once per day.</p>
          <button onClick={markAttendance} disabled={marking} className="btn-primary w-full py-3">
            {marking ? 'Marking...' : '✓ Mark Attendance Now'}
          </button>
        </div>
      )}

      {/* CEO Override form */}
      {isCeo && (
        <div className="card card-body max-w-lg">
          <h2 className="font-semibold font-display mb-4">Override Attendance</h2>
          <form onSubmit={submitOverride} className="space-y-4">
            <div>
              <label className="form-label">Employee</label>
              <select className="form-select" value={override.employee_id} onChange={e => setOverride(p => ({ ...p, employee_id: e.target.value }))} required>
                <option value="">Select employee</option>
                {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={override.date} onChange={e => setOverride(p => ({ ...p, date: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={override.status} onChange={e => setOverride(p => ({ ...p, status: e.target.value }))}>
                {['Present', 'Late', 'Absent', 'No Attendance Entry', 'CEO Override'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Override Reason <span className="text-red-500">*</span></label>
              <textarea className="form-textarea" rows={2} value={override.override_reason} onChange={e => setOverride(p => ({ ...p, override_reason: e.target.value }))} placeholder="Mandatory: explain why you are overriding..." required />
            </div>
            <button type="submit" className="btn-primary">Save Override</button>
          </form>
        </div>
      )}

      {/* Records table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold font-display">Attendance Records</h3>
          <span className="badge badge-blue">{attendance.length}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading...</p>
        ) : attendance.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No attendance records found.</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>Override Reason</th>
                </tr>
              </thead>
              <tbody>
                {[...attendance].reverse().map((a: any) => (
                  <tr key={a.attendance_id}>
                    <td>{a.employee_id}</td>
                    <td>{a.date}</td>
                    <td>{a.time_in}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="font-mono text-xs">{a.ip_address}</td>
                    <td className="text-xs text-surface-500">{a.override_reason || '—'}</td>
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
