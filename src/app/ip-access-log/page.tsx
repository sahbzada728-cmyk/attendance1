'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function IpAccessLogPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/reports?report=ip_log').then(async r => {
      const text = await r.text();
      if (!text.trim()) { setLogs([]); setLoading(false); return; }
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] || '').replace(/^"|"$/g, '').trim()]));
      });
      setLogs(rows.reverse());
    }).finally(() => setLoading(false));
  }, []);

  const statuses = ['All', 'Allowed', 'Denied_Unapproved_IP', 'Denied_Unapproved_Email', 'Allowed_CEO_Bypass', 'Allowed_Testing_Mode'];

  const filtered = logs.filter(l => {
    if (filterStatus !== 'All' && l.access_status !== filterStatus) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const denied = logs.filter(l => l.access_status?.startsWith('Denied')).length;
  const allowed = logs.filter(l => l.access_status?.startsWith('Allowed')).length;

  if (!isCeo) return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h1 className="text-xl font-bold font-display mb-2">CEO Only</h1>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">IP Access Log</h1>
        <p className="text-surface-500 text-sm mt-1">Every login and access attempt recorded with IP address and decision.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="stat-card border-l-4 border-emerald-400">
          <span className="stat-value">{allowed}</span>
          <span className="stat-label">Allowed</span>
        </div>
        <div className="stat-card border-l-4 border-red-400">
          <span className="stat-value">{denied}</span>
          <span className="stat-label">Denied</span>
        </div>
        <div className="stat-card border-l-4 border-blue-400">
          <span className="stat-value">{logs.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Search IP, email..." value={search} onChange={e => setSearch(e.target.value)} className="form-input w-56" />
        <select className="form-select w-56" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading IP log...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No access log entries found.</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((l, i) => {
                  const denied = l.access_status?.startsWith('Denied');
                  const ceo = l.access_status === 'Allowed_CEO_Bypass';
                  return (
                    <tr key={i} className={denied ? 'bg-red-50/30' : ''}>
                      <td className="text-xs font-mono">{l.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="text-xs truncate max-w-40">{l.email}</td>
                      <td>
                        <span className={`badge text-xs ${l.role === 'CEO_SUPER_ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                          {l.role === 'CEO_SUPER_ADMIN' ? 'CEO' : 'EMP'}
                        </span>
                      </td>
                      <td className="font-mono text-xs">{l.ip_address}</td>
                      <td>
                        <span className={`badge text-xs ${denied ? 'badge-red' : ceo ? 'badge-purple' : 'badge-green'}`}>
                          {l.access_status}
                        </span>
                      </td>
                      <td className="text-xs text-surface-500 max-w-48 truncate">{l.reason}</td>
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
