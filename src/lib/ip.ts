/**
 * IP-based access control
 * Uses server-observed public IP (never client-reported LAN IPs).
 */
import type { NextRequest } from 'next/server';
import type { OfficeSettings } from '@/types';

/** Extract the real public IP from the request (Vercel/Render/Railway safe) */
export function getRequestIp(req: NextRequest): string {
  // Vercel: x-forwarded-for is the real client IP when deployed
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // Fallback (local dev)
  return '127.0.0.1';
}

/** Check if an IPv6 address falls within the given prefix (simplified /64 check) */
function matchIpv6Prefix(ip: string, prefix: string): boolean {
  try {
    const [prefixAddr, bits] = prefix.split('/');
    const prefixLen = parseInt(bits || '64', 10);
    const expand = (addr: string) =>
      addr
        .split(':')
        .map(g => g.padStart(4, '0'))
        .join('');
    const ipHex = expand(ip.toLowerCase());
    const prefHex = expand(prefixAddr.toLowerCase());
    // Compare first prefixLen/4 hex chars
    const hexLen = Math.floor(prefixLen / 4);
    return ipHex.slice(0, hexLen) === prefHex.slice(0, hexLen);
  } catch {
    return false;
  }
}

export type AccessResult =
  | { allowed: true; reason: string }
  | { allowed: false; reason: string };

export function canAccessSystem(
  role: string,
  ip: string,
  settings: Pick<OfficeSettings, 'employee_ip_restriction_enabled' | 'allowed_public_ipv4_addresses' | 'allowed_ipv6_prefixes' | 'ceo_any_ip_login_enabled' | 'testing_mode'>,
): AccessResult {
  // CEO bypass
  if (role === 'CEO_SUPER_ADMIN' && String(settings.ceo_any_ip_login_enabled) === 'true') {
    return { allowed: true, reason: 'Allowed_CEO_Bypass' };
  }

  // Testing mode
  if (String(settings.testing_mode) === 'true') {
    return { allowed: true, reason: 'Allowed_Testing_Mode' };
  }

  // Employee IP check
  if (role === 'EMPLOYEE' && String(settings.employee_ip_restriction_enabled) === 'true') {
    const allowedV4 = String(settings.allowed_public_ipv4_addresses || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const allowedV6Prefixes = String(settings.allowed_ipv6_prefixes || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // IPv4 match
    if (allowedV4.includes(ip)) return { allowed: true, reason: 'Allowed' };

    // IPv6 prefix match
    if (ip.includes(':')) {
      for (const prefix of allowedV6Prefixes) {
        if (matchIpv6Prefix(ip, prefix)) return { allowed: true, reason: 'Allowed' };
      }
    }

    return {
      allowed: false,
      reason: `Denied_Unapproved_IP: ${ip} is not in the approved office IP list.`,
    };
  }

  return { allowed: true, reason: 'Allowed' };
}
