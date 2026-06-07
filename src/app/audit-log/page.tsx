'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

export default function AuditLogPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  useEffect(() => {
    fetch('/api/admin/reports?report=audit').then(async r => {
      const text = await r.text();
      if (!text.trim()) { setLogs([]); setLoading(false); return; }
      // Parse CSV
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,))/g) || line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] || '').replace(/^"|"$/g, '').trim()]));
      });
      setLogs(rows.reverse());
    }).finally(() => setLoading(false));
  }, []);

  const actions = ['All', ...Array.from(new Set(logs.map(l => l.action))).sort()];

  const filtered = logs.filter(l => {
    if (filterAction !== 'All' && l.action !== filterAction) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!isCeo) return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h1 className="text-xl font-bold font-display mb-2">CEO Only</h1>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Audit Log</h1>
        <p className="text-surface-500 text-sm mt-1">Every critical business action recorded with user, timestamp, and change details.</p>
      </div>

      <div className="flex gap-3">
        <input type="text" placeholder="Search audit log..." value={search} onChange={e => setSearch(e.target.value)} className="form-input w-64" />
        <select className="form-select w-44" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
        <span className="flex items-center text-sm text-surface-400">{filtered.length} entries</span>
      </div>

      <div className="card">
        {loading ? (
          <p className="p-6 text-sm text-surface-400">Loading audit log...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No audit entries found.</p>
        ) : (
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((l, i) => (
                  <tr key={i}>
                    <td className="text-xs font-mono">{l.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                    <td className="text-xs truncate max-w-32">{l.user_email}</td>
                    <td>
                      <span className={`badge text-xs ${l.user_role === 'CEO_SUPER_ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                        {l.user_role === 'CEO_SUPER_ADMIN' ? 'CEO' : 'EMP'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge text-xs ${l.action === 'CREATE' ? 'badge-green' : l.action === 'DELETE' ? 'badge-red' : l.action === 'OVERRIDE' ? 'badge-orange' : 'badge-blue'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="text-xs">{l.entity_type}</td>
                    <td className="text-xs font-mono truncate max-w-24">{l.entity_id}</td>
                    <td className="text-xs font-mono">{l.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filtered.length > 200 && (
        <p className="text-center text-xs text-surface-400">Showing 200 of {filtered.length} entries. Export CSV for full log.</p>
      )}
    </div>
  );
}
