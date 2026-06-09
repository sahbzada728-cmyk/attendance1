import type { NextAuthOptions, Session, User as NextAuthUser } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
//import { getAllRows, appendRow, makeId } from './supabase-repo'; // Changed from sheets
import { getRequestIp, canAccessSystem } from './ip';
import type { User, OfficeSettings } from '@/types';

const CEO_EMAIL = process.env.CEO_SUPER_ADMIN_EMAIL || 'mjagrogroupe@gmail.com';
const EMPLOYEE_EMAILS = (process.env.EMPLOYEE_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const APPROVED_EMAILS: Record<string, 'CEO_SUPER_ADMIN' | 'EMPLOYEE'> = {
  [CEO_EMAIL.toLowerCase()]: 'CEO_SUPER_ADMIN',
  ...Object.fromEntries(EMPLOYEE_EMAILS.map(e => [e, 'EMPLOYEE'])),
};

export async function getSettings(): Promise<OfficeSettings> {
  const rows = await getAllRows<OfficeSettings>('Office_Settings');
  const s = rows.find((r: { setting_id: string; }) => r.setting_id === 'default') || rows[0];
  if (!s) {
    return {
      setting_id: 'default',
      office_start_time: '11:00',
      office_end_time: '19:00',
      timezone: 'Asia/Karachi',
      attendance_grace_minutes: 20,
      grace_period_configurable: true,
      progress_report_window_minutes: 30,
      weekly_off_day: 'Sunday',
      employee_ip_restriction_enabled: process.env.EMPLOYEE_IP_RESTRICTION_ENABLED !== 'false',
      allowed_public_ipv4_addresses: process.env.ALLOWED_PUBLIC_IPV4_ADDRESSES || '119.73.100.243',
      allowed_ipv6_prefixes: process.env.ALLOWED_IPV6_PREFIXES || '2407:aa80:314:8ad4::/64',
      ceo_any_ip_login_enabled: process.env.CEO_ANY_IP_LOGIN_ENABLED !== 'false',
      testing_mode: process.env.TESTING_MODE === 'true',
      emergency_override_enabled: false,
      updated_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return {
    ...s,
    attendance_grace_minutes: Number(s.attendance_grace_minutes) || 20,
    progress_report_window_minutes: Number(s.progress_report_window_minutes) || 30,
    employee_ip_restriction_enabled: String(s.employee_ip_restriction_enabled) === 'true',
    ceo_any_ip_login_enabled: String(s.ceo_any_ip_login_enabled) !== 'false',
    testing_mode: String(s.testing_mode) === 'true',
    emergency_override_enabled: String(s.emergency_override_enabled) === 'true',
    grace_period_configurable: String(s.grace_period_configurable) !== 'false',
  };
}

export async function getUserRecord(email: string): Promise<User | null> {
  const users = await getAllRows<User>('Users');
  return users.find((u: { email: string; }) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase() || '';
      const role = APPROVED_EMAILS[email];
      if (!role) return '/access-denied?reason=unapproved_email';
      
      // Ensure user record exists in Supabase
      try {
        const existing = await getUserRecord(email);
        if (!existing) {
          const employees = await getAllRows<any>('Employees');
          const emp = employees.find((e: any) => e.email.toLowerCase() === email);
          await appendRow('Users', {
            user_id: makeId('usr'),
            email,
            full_name: user.name || email,
            role,
            employee_id: emp?.employee_id || '',
            is_active: true,
            can_login_from_any_ip: role === 'CEO_SUPER_ADMIN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Could not write user to Supabase:', err);
        // Don't block login if Supabase write fails
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const role = APPROVED_EMAILS[email] || 'EMPLOYEE';
        token.role = role;
        token.email = email;
        token.name = user.name;
        // Fetch employee_id
        try {
          const employees = await getAllRows<any>('Employees');
          const emp = employees.find((e: any) => e.email.toLowerCase() === email);
          token.employee_id = emp?.employee_id || '';
        } catch { token.employee_id = ''; }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        role: token.role as string,
        employee_id: token.employee_id as string,
      } as any;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/access-denied',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      employee_id: string;
    };
  }
}