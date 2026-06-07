'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', email: '', role_position: '', department: '', status: 'Active', ssid: '', local_ipv4_address: '', mac_address: '', observed_ipv6_prefix: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isCeo) return;
    fetch('/api/admin/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [isCeo]);

  if (!isCeo) return (
    <div className="max-w-md mx-auto mt-20 text-center"><p className="text-4xl mb-4">🔒</p><h1 className="text-xl font-bold font-display mb-2">CEO Only</h1></div>
  );

  function startEdit(emp: any) {
    setEditEmp(emp);
    setForm({ full_name: emp.full_name, email: emp.email, role_position: emp.role_position, department: emp.department, status: emp.status, ssid: emp.ssid || '', local_ipv4_address: emp.local_ipv4_address || '', mac_address: emp.mac_address || '', observed_ipv6_prefix: emp.observed_ipv6_prefix || '' });
    setShowForm(true);
  }

  function resetForm() { setEditEmp(null); setShowForm(false); setForm({ full_name: '', email: '', role_position: '', department: '', status: 'Active', ssid: '', local_ipv4_address: '', mac_address: '', observed_ipv6_prefix: '' }); }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [field]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg(null);
    const method = editEmp ? 'PATCH' : 'POST';
    const body = editEmp ? { ...form, employee_id: editEmp.employee_id } : form;
    const res = await fetch('/api/admin/employees', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      if (editEmp) {
        setEmployees(prev => prev.map(e => e.employee_id === editEmp.employee_id ? { ...e, ...data } : e));
        setMsg({ type: 'success', text: 'Employee updated.' });
      } else {
        setEmployees(prev => [...prev, data]);
        setMsg({ type: 'success', text: `Employee ${data.full_name} added. They can now log in with ${data.email}.` });
      }
      resetForm();
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed' });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Employee Management</h1>
          <p className="text-surface-500 text-sm mt-1">{employees.filter(e => e.status === 'Active').length} active employees</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">+ Add Employee</button>
      </div>

      {msg && (
        <div className={`${msg.type === 'success' ? 'alert-success' : 'alert-error'} alert`}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span><span>{msg.text}</span>
        </div>
      )}

      {showForm && (
        <div className="card card-body max-w-2xl">
          <h2 className="font-semibold font-display mb-4">{editEmp ? `Edit: ${editEmp.full_name}` : 'Add New Employee'}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                <input className="form-input" value={form.full_name} onChange={f('full_name')} required placeholder="Mr Ali Janjua" />
              </div>
              <div>
                <label className="form-label">Gmail Address <span className="text-red-500">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={f('email')} required placeholder="employee@gmail.com" disabled={!!editEmp} />
                {editEmp && <p className="text-xs text-surface-400 mt-1">Email cannot be changed after creation.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Role / Position</label>
                <input className="form-input" value={form.role_position} onChange={f('role_position')} placeholder="Account & Admin Officer" />
              </div>
              <div>
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={f('department')} placeholder="Accounts & Administration" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={f('status')}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div>
                <label className="form-label">Wi-Fi SSID</label>
                <input className="form-input" value={form.ssid} onChange={f('ssid')} placeholder="Tavaazo 2.4G" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Local IPv4 (for reference)</label>
                <input className="form-input font-mono" value={form.local_ipv4_address} onChange={f('local_ipv4_address')} placeholder="192.168.18.6" />
              </div>
              <div>
                <label className="form-label">MAC Address (for reference)</label>
                <input className="form-input font-mono" value={form.mac_address} onChange={f('mac_address')} placeholder="00-E0-21-33-15-6B" />
              </div>
            </div>
            <div>
              <label className="form-label">IPv6 Prefix (for reference)</label>
              <input className="form-input font-mono" value={form.observed_ipv6_prefix} onChange={f('observed_ipv6_prefix')} placeholder="2407:aa80:314:8ad4::/64" />
              <p className="text-xs text-surface-400 mt-1">Note: Access control uses server-observed PUBLIC IP, not these local addresses.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editEmp ? 'Save Changes' : 'Add Employee'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold font-display">Employees</h3>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No employees yet. Add the first employee above.</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role / Position</th>
                  <th>Department</th>
                  <th>SSID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.employee_id}>
                    <td className="text-surface-400">{e.employee_no}</td>
                    <td className="font-medium">{e.full_name}</td>
                    <td className="text-xs font-mono">{e.email}</td>
                    <td>{e.role_position}</td>
                    <td>{e.department}</td>
                    <td className="text-xs">{e.ssid || '—'}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>
                      <button onClick={() => startEdit(e)} className="btn-ghost btn-sm">Edit</button>
                    </td>
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
