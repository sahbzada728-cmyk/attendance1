'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const REPORTS = [
  { id: 'attendance',   label: 'Attendance Report',            icon: '📅', desc: 'Daily attendance records with status, time-in, IP, overrides' },
  { id: 'commitments',  label: 'Daily Commitment Report',       icon: '📋', desc: 'Employee daily work commitment submissions' },
  { id: 'tasks',        label: 'Task Report',                   icon: '✅', desc: 'All tasks with status, priority, due dates, and completion' },
  { id: 'progress',     label: 'Daily Progress Report',         icon: '📊', desc: 'Task progress entries including No Activity & Blocked reasons' },
  { id: 'employees',    label: 'Employee Report',               icon: '👥', desc: 'Employee roster with network and device info' },
  { id: 'audit',        label: 'Audit Log',                     icon: '🔍', desc: 'All critical system actions with user, timestamp, and changes' },
  { id: 'ip_log',       label: 'IP Access Log',                 icon: '🌐', desc: 'All login attempts with IP, status (allowed/denied), and reason' },
  { id: 'notifications',label: 'Notification Log',              icon: '📧', desc: 'Email reminders and summaries sent via Gmail API' },
];

export default function ReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isCeo) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-xl font-bold font-display mb-2">CEO Only</h1>
        <p className="text-surface-500 text-sm">Reports are accessible only to the CEO/Super Admin.</p>
      </div>
    );
  }

  async function downloadReport(reportId: string) {
    setDownloading(reportId);
    const params = new URLSearchParams({ report: reportId, date_from: dateFrom, date_to: dateTo });
    try {
      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) { alert('Failed to generate report'); setDownloading(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}_${dateFrom}_to_${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + String(err));
    }
    setDownloading(null);
  }

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Reports</h1>
        <p className="text-surface-500 text-sm mt-1">Export all data as CSV. Filter by date range below.</p>
      </div>

      {/* Date range filter */}
      <div className="card card-body max-w-lg">
        <h3 className="font-semibold font-display mb-4">Date Range Filter</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[
            { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t); } },
            { label: 'This Week', fn: () => {
              const now = new Date(); const day = now.getDay();
              const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
              setDateFrom(mon.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10));
            }},
            { label: 'This Month', fn: () => {
              const now = new Date();
              setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
              setDateTo(now.toISOString().slice(0,10));
            }},
          ].map(q => (
            <button key={q.label} onClick={q.fn} className="btn-secondary btn-sm">{q.label}</button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <div key={r.id} className="card card-body flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <p className="font-semibold font-display text-surface-900">{r.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{r.desc}</p>
                <p className="text-xs text-surface-400 mt-1">{dateFrom} → {dateTo}</p>
              </div>
            </div>
            <button
              onClick={() => downloadReport(r.id)}
              disabled={downloading === r.id}
              className="btn-primary btn-sm whitespace-nowrap"
            >
              {downloading === r.id ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Exporting...
                </span>
              ) : '↓ CSV'}
            </button>
          </div>
        ))}
      </div>

      {/* Cron trigger panel */}
      <div className="card card-body">
        <h3 className="font-semibold font-display mb-1">Email Notifications (Manual Trigger)</h3>
        <p className="text-xs text-surface-400 mb-4">Trigger cron emails manually for testing. In production these run on schedule via Vercel Cron / external cron service.</p>
        <div className="flex flex-wrap gap-3">
          {[
            { type: 'attendance_reminder',  label: 'Send Attendance Reminder' },
            { type: 'commitment_reminder',  label: 'Send Commitment Reminder' },
            { type: 'progress_reminder',    label: 'Send Progress Reminder' },
            { type: 'ceo_summary',          label: 'Send CEO Day Summary' },
          ].map(c => (
            <button
              key={c.type}
              onClick={async () => {
                const secret = prompt('Enter CRON_SECRET to trigger:');
                if (!secret) return;
                const res = await fetch(`/api/cron?type=${c.type}&secret=${secret}`);
                const d = await res.json();
                alert(res.ok ? `✓ ${c.label} sent` : `✗ Error: ${d.error}`);
              }}
              className="btn-secondary"
            >
              📧 {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
