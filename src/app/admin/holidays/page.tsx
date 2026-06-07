'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const PK_BASELINE = [
  { name: 'Kashmir Solidarity Day', date: '2025-02-05', type: 'Pakistan Public Holiday' },
  { name: 'Pakistan Day', date: '2025-03-23', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Fitr (Day 1)', date: '2025-03-30', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Fitr (Day 2)', date: '2025-03-31', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Fitr (Day 3)', date: '2025-04-01', type: 'Pakistan Public Holiday' },
  { name: 'Labour Day', date: '2025-05-01', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Adha (Day 1)', date: '2025-06-06', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Adha (Day 2)', date: '2025-06-07', type: 'Pakistan Public Holiday' },
  { name: 'Eid ul-Adha (Day 3)', date: '2025-06-08', type: 'Pakistan Public Holiday' },
  { name: 'Muharram / Ashura', date: '2025-07-06', type: 'Pakistan Public Holiday' },
  { name: 'Independence Day', date: '2025-08-14', type: 'Pakistan Public Holiday' },
  { name: 'Eid Milaad-un-Nabi', date: '2025-09-05', type: 'Pakistan Public Holiday' },
  { name: 'Iqbal Day', date: '2025-11-09', type: 'Pakistan Public Holiday' },
  { name: "Quaid-e-Azam Day", date: '2025-12-25', type: 'Pakistan Public Holiday' },
  { name: 'Kashmir Solidarity Day', date: '2026-02-05', type: 'Pakistan Public Holiday' },
  { name: 'Pakistan Day', date: '2026-03-23', type: 'Pakistan Public Holiday' },
  { name: 'Labour Day', date: '2026-05-01', type: 'Pakistan Public Holiday' },
  { name: 'Independence Day', date: '2026-08-14', type: 'Pakistan Public Holiday' },
  { name: 'Iqbal Day', date: '2026-11-09', type: 'Pakistan Public Holiday' },
  { name: "Quaid-e-Azam Day", date: '2026-12-25', type: 'Pakistan Public Holiday' },
];

export default function HolidaysPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ holiday_name: '', holiday_date: '', holiday_type: 'Pakistan Public Holiday', country: 'Pakistan', is_working_day: false });
  const [seedingBaseline, setSeedingBaseline] = useState(false);

  useEffect(() => {
    fetch('/api/admin/holidays').then(r => r.json()).then(d => {
      setHolidays(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  if (!isCeo) return (
    <div className="max-w-md mx-auto mt-20 text-center"><p className="text-4xl mb-4">🔒</p><h1 className="text-xl font-bold font-display mb-2">CEO Only</h1></div>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg(null);
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setHolidays(prev => [...prev, data].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
      setMsg({ type: 'success', text: `Holiday "${data.holiday_name}" added.` });
      setShowForm(false);
      setForm({ holiday_name: '', holiday_date: '', holiday_type: 'Pakistan Public Holiday', country: 'Pakistan', is_working_day: false });
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed' });
    }
    setSubmitting(false);
  }

  async function seedBaseline() {
    setSeedingBaseline(true); setMsg(null);
    let added = 0;
    const existing = new Set(holidays.map(h => h.holiday_date));
    for (const h of PK_BASELINE) {
      if (existing.has(h.date)) continue;
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holiday_name: h.name, holiday_date: h.date, holiday_type: h.type, country: 'Pakistan', is_working_day: false }),
      });
      if (res.ok) { const d = await res.json(); setHolidays(prev => [...prev, d]); added++; }
    }
    setMsg({ type: 'success', text: `Seeded ${added} Pakistan public holidays (2025–2026).` });
    setSeedingBaseline(false);
  }

  async function toggleWorkingDay(holiday: any) {
    const patch = { holiday_id: holiday.holiday_id, is_working_day: String(holiday.is_working_day) !== 'true' };
    const res = await fetch('/api/admin/holidays', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setHolidays(prev => prev.map(h => h.holiday_id === holiday.holiday_id ? { ...h, is_working_day: patch.is_working_day } : h));
    }
  }

  const sorted = [...holidays].sort((a, b) => a.holiday_date?.localeCompare(b.holiday_date));

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 font-display">Public Holiday Calendar</h1>
          <p className="text-surface-500 text-sm mt-1">Employees are not required to mark attendance or submit progress on holidays. Sunday is always off.</p>
        </div>
        <div className="flex gap-2">
          {holidays.length === 0 && (
            <button onClick={seedBaseline} disabled={seedingBaseline} className="btn-secondary">
              {seedingBaseline ? 'Seeding...' : '📅 Seed PK Holidays 2025–26'}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Holiday</button>
        </div>
      </div>

      {msg && (
        <div className={`${msg.type === 'success' ? 'alert-success' : 'alert-error'} alert`}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span><span>{msg.text}</span>
        </div>
      )}

      {showForm && (
        <div className="card card-body max-w-lg">
          <h2 className="font-semibold font-display mb-4">Add Holiday</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="form-label">Holiday Name <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.holiday_name} onChange={e => setForm(p => ({ ...p, holiday_name: e.target.value }))} required placeholder="e.g., Eid ul-Adha" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={form.holiday_date} onChange={e => setForm(p => ({ ...p, holiday_date: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={form.holiday_type} onChange={e => setForm(p => ({ ...p, holiday_type: e.target.value }))}>
                  {['Pakistan Public Holiday', 'Company Holiday', 'Optional Holiday', 'Special Closure'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="working" checked={form.is_working_day} onChange={e => setForm(p => ({ ...p, is_working_day: e.target.checked }))} className="rounded" />
              <label htmlFor="working" className="text-sm text-surface-700">Mark as working day (overrides holiday status)</label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Holiday'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold font-display">Holidays</h3>
          <span className="badge badge-blue">{holidays.length}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading...</p>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-surface-500 text-sm mb-4">No holidays added yet.</p>
            <button onClick={seedBaseline} disabled={seedingBaseline} className="btn-primary">
              {seedingBaseline ? 'Seeding...' : '📅 Seed Pakistan Public Holidays 2025–2026'}
            </button>
          </div>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday Name</th>
                  <th>Type</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(h => {
                  const isWorking = String(h.is_working_day) === 'true';
                  const isPast = h.holiday_date < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={h.holiday_id} className={isPast ? 'opacity-60' : ''}>
                      <td className="font-mono text-sm font-medium">{h.holiday_date}</td>
                      <td className="font-medium">{h.holiday_name}</td>
                      <td>
                        <span className={`badge text-xs ${h.holiday_type === 'Pakistan Public Holiday' ? 'badge-green' : h.holiday_type === 'Company Holiday' ? 'badge-blue' : 'badge-gray'}`}>
                          {h.holiday_type}
                        </span>
                      </td>
                      <td className="text-xs text-surface-500">{h.country || 'Pakistan'}</td>
                      <td>
                        <span className={`badge text-xs ${isWorking ? 'badge-yellow' : 'badge-red'}`}>
                          {isWorking ? 'Working Day' : 'Off Day'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleWorkingDay(h)}
                          className="btn-ghost btn-sm text-xs"
                          title={isWorking ? 'Mark as Off Day' : 'Mark as Working Day'}
                        >
                          {isWorking ? '→ Set Off' : '→ Set Working'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="alert-info alert max-w-2xl">
        <span>ℹ</span>
        <div className="text-sm">
          <p className="font-medium">How holidays affect the system</p>
          <p className="mt-1">Employees are <strong>not required</strong> to mark attendance or submit daily progress on holidays. The system automatically skips attendance/progress requirements on these dates. Sunday is always off regardless of this list.</p>
        </div>
      </div>
    </div>
  );
}
