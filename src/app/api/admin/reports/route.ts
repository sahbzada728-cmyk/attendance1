import { NextRequest } from 'next/server';
import { requireUser, json, forbid } from '@/lib/api';
import { getAllRows } from '@/lib/sheets';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = String(r[h] ?? '').replace(/"/g, '""');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
    }).join(',')),
  ];
  return lines.join('\n');
}

const SHEET_MAP: Record<string, string> = {
  attendance: 'Attendance',
  commitments: 'Daily_Commitments',
  tasks: 'Tasks',
  progress: 'Daily_Task_Progress',
  employees: 'Employees',
  audit: 'Audit_Log',
  ip_log: 'IP_Access_Log',
  notifications: 'Notifications',
};

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.error) return ctx.error;
  if (ctx.user!.role !== 'CEO_SUPER_ADMIN') return forbid();

  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report') || 'attendance';
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const employeeId = searchParams.get('employee_id');

  const sheetName = SHEET_MAP[report];
  if (!sheetName) return json({ error: `Unknown report: ${report}` }, 400);

  let rows = await getAllRows<any>(sheetName);

  // Filter by date if field exists
  if (dateFrom || dateTo) {
    const dateField = rows[0] ? Object.keys(rows[0]).find(k => k === 'date') : null;
    if (dateField) {
      if (dateFrom) rows = rows.filter(r => r.date >= dateFrom);
      if (dateTo) rows = rows.filter(r => r.date <= dateTo);
    }
  }

  if (employeeId) {
    rows = rows.filter(r => r.employee_id === employeeId || r.user_id === employeeId);
  }

  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${report}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
