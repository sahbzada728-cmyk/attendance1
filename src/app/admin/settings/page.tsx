'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isCeo = (session?.user as any)?.role === 'CEO_SUPER_ADMIN';
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setSettings(d);
    }).finally(() => setLoading(false));
  }, []);

  if (!isCeo) return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h1 className="text-xl font-bold font-display mb-2">CEO Only</h1>
      <p className="text-surface-500 text-sm">Only the CEO/Super Admin can change office settings.</p>
    </div>
  );

  if (loading || !settings) return <div className="p-8 text-surface-400 text-sm">Loading settings...</div>;

  function upd(field: string, value: unknown) {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const payload = {
      office_start_time: settings.office_start_time,
      office_end_time: settings.office_end_time,
      timezone: settings.timezone,
      attendance_grace_minutes: Number(settings.attendance_grace_minutes),
      progress_report_window_minutes: Number(settings.progress_report_window_minutes),
      weekly_off_day: settings.weekly_off_day,
      employee_ip_restriction_enabled: String(settings.employee_ip_restriction_enabled) === 'true',
      allowed_public_ipv4_addresses: settings.allowed_public_ipv4_addresses,
      allowed_ipv6_prefixes: settings.allowed_ipv6_prefixes || '',
      ceo_any_ip_login_enabled: String(settings.ceo_any_ip_login_enabled) !== 'false',
      testing_mode: String(settings.testing_mode) === 'true',
      emergency_override_enabled: String(settings.emergency_override_enabled) === 'true',
      grace_period_configurable: true,
    };
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setSettings(data);
      setMsg({ type: 'success', text: 'Office settings saved successfully.' });
    } else {
      setMsg({ type: 'error', text: data.error || 'Save failed' });
    }
    setSaving(false);
  }

  // Compute derived windows for display
  const graceMin = Number(settings.attendance_grace_minutes) || 20;
  const progressMin = Number(settings.progress_report_window_minutes) || 30;
  const startParts = String(settings.office_start_time || '11:00').split(':').map(Number);
  const endParts = String(settings.office_end_time || '19:00').split(':').map(Number);
  const attEnd = `${String(startParts[0]).padStart(2,'0')}:${String((startParts[1] || 0) + graceMin).padStart(2,'0')}`;
  const progStartMin = endParts[0] * 60 + (endParts[1] || 0) - progressMin;
  const progStart = `${String(Math.floor(progStartMin / 60)).padStart(2,'0')}:${String(progStartMin % 60).padStart(2,'0')}`;

  return (
    <div className="max-w-3xl space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">Office Settings</h1>
        <p className="text-surface-500 text-sm mt-1">Configure office timing, IP restrictions, and system behaviour.</p>
      </div>

      {msg && (
        <div className={`${msg.type === 'success' ? 'alert-success' : 'alert-error'} alert`}>
          <span>{msg.type === 'success' ? '✓' : '✗'}</span><span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">

        {/* Office Timing */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display">🕐 Office Timing</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Office Start Time</label>
                <input type="time" className="form-input font-mono" value={settings.office_start_time || '11:00'} onChange={e => upd('office_start_time', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Office Closing Time</label>
                <input type="time" className="form-input font-mono" value={settings.office_end_time || '19:00'} onChange={e => upd('office_end_time', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Timezone</label>
                <select className="form-select" value={settings.timezone || 'Asia/Karachi'} onChange={e => upd('timezone', e.target.value)}>
                  <option value="Asia/Karachi">Asia/Karachi (PKT, UTC+5)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Weekly Off Day</label>
                <select className="form-select" value={settings.weekly_off_day || 'Sunday'} onChange={e => upd('weekly_off_day', e.target.value)}>
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Window */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display">📅 Attendance Window</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Grace Period (minutes)</label>
                <input type="number" min={0} max={120} className="form-input" value={settings.attendance_grace_minutes || 20} onChange={e => upd('attendance_grace_minutes', e.target.value)} />
              </div>
              <div className="flex flex-col justify-end">
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                  <p className="text-xs font-semibold text-brand-700 mb-1">Current Attendance Window</p>
                  <p className="font-mono text-brand-900 font-bold">{settings.office_start_time} → {attEnd}</p>
                  <p className="text-xs text-brand-600 mt-0.5">Present if ≤ {settings.office_start_time}, Late if after</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Report Window */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display">📊 Progress Report Window</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Window Duration (minutes before close)</label>
                <input type="number" min={10} max={120} className="form-input" value={settings.progress_report_window_minutes || 30} onChange={e => upd('progress_report_window_minutes', e.target.value)} />
              </div>
              <div className="flex flex-col justify-end">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Current Progress Window</p>
                  <p className="font-mono text-emerald-900 font-bold">{progStart} → {settings.office_end_time}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Auto-adjusts if office close time changes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IP Access Control */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold font-display">🌐 IP Access Control</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
              <div>
                <p className="font-medium text-sm">Employee IP Restriction</p>
                <p className="text-xs text-surface-500">Block employees from outside approved office IP</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={String(settings.employee_ip_restriction_enabled) === 'true'}
                  onChange={e => upd('employee_ip_restriction_enabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
              </label>
            </div>

            <div>
              <label className="form-label">Approved Office Public IPv4 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="form-input font-mono"
                value={settings.allowed_public_ipv4_addresses || '119.73.100.243'}
                onChange={e => upd('allowed_public_ipv4_addresses', e.target.value)}
                placeholder="119.73.100.243"
              />
              <p className="text-xs text-surface-400 mt-1">The server-observed public IP of the office internet connection. Update if your ISP changes the IP.</p>
            </div>

            <div>
              <label className="form-label">Approved IPv6 Prefixes</label>
              <input
                type="text"
                className="form-input font-mono"
                value={settings.allowed_ipv6_prefixes || ''}
                onChange={e => upd('allowed_ipv6_prefixes', e.target.value)}
                placeholder="2407:aa80:314:8ad4::/64"
              />
              <p className="text-xs text-surface-400 mt-1">Optional. Used when employees connect via IPv6. Separate multiple with commas.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">CEO Unrestricted Login</p>
                  <p className="text-xs text-surface-500">Allow CEO from any IP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={String(settings.ceo_any_ip_login_enabled) !== 'false'}
                    onChange={e => upd('ceo_any_ip_login_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <p className="font-medium text-sm text-amber-900">Emergency Override</p>
                  <p className="text-xs text-amber-700">Allow all approved emails from any IP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={String(settings.emergency_override_enabled) === 'true'}
                    onChange={e => upd('emergency_override_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
              <div>
                <p className="font-medium text-sm text-red-900">Testing Mode</p>
                <p className="text-xs text-red-700">Bypass IP checks for all approved users. <strong>Disable before go-live.</strong></p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={String(settings.testing_mode) === 'true'}
                  onChange={e => upd('testing_mode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : '✓ Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
