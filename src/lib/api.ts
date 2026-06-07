import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions, getSettings, APPROVED_EMAILS } from './auth';
import { canAccessSystem, getRequestIp } from './ip';
import { getAllRows, appendRow, makeId } from './sheets';
import type { OfficeSettings, User } from '@/types';

export type ApiContext = {
  user: (User & { role: string; employee_id: string }) | null;
  settings: OfficeSettings;
  ip: string;
  error?: NextResponse;
};

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
export function bad(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}
export function forbid(msg = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 403 });
}
export function unauth(msg = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 401 });
}

/** Require a valid session. Returns context or error response. */
export async function requireUser(req: NextRequest): Promise<ApiContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { user: null, settings: await getSettings(), ip: getRequestIp(req), error: unauth() };
  }
  const email = session.user.email.toLowerCase();
  const role = APPROVED_EMAILS[email];
  if (!role) {
    return { user: null, settings: await getSettings(), ip: getRequestIp(req), error: forbid('Email not approved.') };
  }

  const settings = await getSettings();
  const ip = getRequestIp(req);

  // IP check
  const access = canAccessSystem(role, ip, settings);
  if (!access.allowed) {
    // Log the denied attempt
    try {
      await logIpAccess({ user_id: '', role, email, ip_address: ip, ipv6_address: '', device_info: req.headers.get('user-agent') || '', access_status: 'Denied_Unapproved_IP', reason: access.reason });
    } catch { /* non-blocking */ }
    return { user: null, settings, ip, error: forbid('Access denied. Employee access is allowed only from the approved office Wi-Fi/IP.') };
  }

  // Build user object
  let users: User[] = [];
  try { users = await getAllRows<User>('Users'); } catch { /* Sheets not set up yet */ }
  let employees: any[] = [];
  try { employees = await getAllRows<any>('Employees'); } catch { /* Sheets not set up yet */ }

  const userRecord = users.find(u => u.email.toLowerCase() === email);
  const empRecord = employees.find(e => e.email?.toLowerCase() === email);

  const user = {
    user_id: userRecord?.user_id || makeId('usr'),
    email,
    full_name: userRecord?.full_name || session.user.name || email,
    role,
    employee_id: userRecord?.employee_id || empRecord?.employee_id || '',
    is_active: true,
    can_login_from_any_ip: role === 'CEO_SUPER_ADMIN',
    created_at: userRecord?.created_at || '',
    updated_at: userRecord?.updated_at || '',
  } as User & { role: string; employee_id: string };

  return { user, settings, ip, error: undefined };
}

export async function auditLog(user: any, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown, ip: string, device = ''): Promise<void> {
  try {
    await appendRow('Audit_Log', {
      audit_id: makeId('aud'),
      user_id: user?.user_id || '',
      user_email: user?.email || '',
      user_role: user?.role || '',
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue ? JSON.stringify(oldValue) : '',
      new_value: newValue ? JSON.stringify(newValue) : '',
      ip_address: ip,
      device_info: device,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export async function logIpAccess(params: { user_id: string; role: string; email: string; ip_address: string; ipv6_address: string; device_info: string; access_status: string; reason: string }): Promise<void> {
  try {
    await appendRow('IP_Access_Log', {
      access_log_id: makeId('ipl'),
      ...params,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('IP access log failed:', err);
  }
}
