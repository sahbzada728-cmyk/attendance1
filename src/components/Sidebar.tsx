'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',       icon: '⬛' },
  { href: '/attendance',       label: 'Attendance',      icon: '📅' },
  { href: '/commitments',      label: 'Daily Commitment', icon: '📋' },
  { href: '/tasks',            label: 'Tasks',            icon: '✅' },
  { href: '/progress',         label: 'Daily Progress',   icon: '📊' },
  { href: '/reports',          label: 'Reports',          icon: '📈', roles: ['CEO_SUPER_ADMIN'] },
  { href: '/audit-log',        label: 'Audit Log',        icon: '🔍', roles: ['CEO_SUPER_ADMIN'] },
  { href: '/ip-access-log',    label: 'IP Access Log',    icon: '🌐', roles: ['CEO_SUPER_ADMIN'] },
  { href: '/admin/employees',  label: 'Employees',        icon: '👥', roles: ['CEO_SUPER_ADMIN'] },
  { href: '/admin/holidays',   label: 'Holidays',         icon: '🗓️', roles: ['CEO_SUPER_ADMIN'] },
  { href: '/admin/settings',   label: 'Office Settings',  icon: '⚙️', roles: ['CEO_SUPER_ADMIN'] },
];

export default function Sidebar({ role, name, email }: { role: string; name: string; email: string }) {
  const path = usePathname();
  const isCeo = role === 'CEO_SUPER_ADMIN';

  const visible = NAV.filter(item => !item.roles || item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-surface-200 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold font-display text-sm">OA</div>
          <div>
            <p className="text-sm font-semibold text-surface-900 font-display leading-tight">Office Attendance</p>
            <p className="text-xs text-surface-400">MJ Agro Trading</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <span className={`badge text-xs ${isCeo ? 'badge-purple' : 'badge-blue'}`}>
          {isCeo ? '👑 CEO / Super Admin' : '👤 Employee'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? 'active' : ''}`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-surface-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{name}</p>
            <p className="text-xs text-surface-400 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full btn-secondary btn text-sm py-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
