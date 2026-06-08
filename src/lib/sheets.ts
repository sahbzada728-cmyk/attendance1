/**
 * Google Sheets repository layer
 * Uses googleapis with a Service Account for server-side read/write.
 */
import { google, sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY
  ?.split('\\n')
  .join('\n');
  if (!key || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
    throw new Error('Google Sheets credentials not configured. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.');
  }
  return new google.auth.JWT(process.env.GOOGLE_SHEETS_CLIENT_EMAIL, undefined, key, SCOPES);
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = () => {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set.');
  return id;
};

// ─── Schema (ordered header columns per tab) ─────────────────────────────────
export const SHEET_SCHEMAS: Record<string, string[]> = {
  Users: ['user_id','email','full_name','role','employee_id','is_active','can_login_from_any_ip','created_at','updated_at'],
  Employees: ['employee_id','employee_no','full_name','email','role_position','department','status','office_timing_group','access_rule','ssid','wifi_protocol','network_band','network_channel','local_ipv4_address','ipv4_dns','ipv6_addresses','observed_ipv6_prefix','adapter_manufacturer','adapter_description','driver_version','mac_address','created_at','updated_at'],
  Office_Settings: ['setting_id','office_start_time','office_end_time','timezone','attendance_grace_minutes','grace_period_configurable','progress_report_window_minutes','weekly_off_day','employee_ip_restriction_enabled','allowed_public_ipv4_addresses','allowed_ipv6_prefixes','ceo_any_ip_login_enabled','testing_mode','emergency_override_enabled','updated_by','created_at','updated_at'],
  Holidays: ['holiday_id','holiday_name','holiday_date','holiday_type','country','is_working_day','created_by','created_at','updated_at'],
  Attendance: ['attendance_id','employee_id','date','time_in','status','ip_address','ipv6_address','device_info','is_within_allowed_window','is_from_allowed_ip','override_by','override_reason','created_at','updated_at'],
  Daily_Commitments: ['commitment_id','employee_id','date','planned_task','expected_output','priority','estimated_completion_time','notes','submitted_at','submitted_ip','status','created_at','updated_at'],
  Tasks: ['task_id','title','description','assigned_to','assigned_by','department','priority','start_date','due_date','status','final_approval_status','attachment_links','rejection_reason','created_at','updated_at','completed_at'],
  Subtasks: ['subtask_id','task_id','title','description','assigned_to','due_date','priority','status','progress_percent','created_at','updated_at'],
  Comments: ['comment_id','task_id','subtask_id','user_id','user_role','comment_text','edited','edit_history','created_at','updated_at'],
  Daily_Task_Progress: ['progress_id','task_id','employee_id','date','progress_status','progress_description','no_activity_reason','blocker_reason','submitted_at','submitted_ip','submitted_device','is_within_allowed_window','created_at'],
  Notifications: ['notification_id','employee_id','recipient_email','type','subject','message','sent_at','status','error_message','created_at'],
  IP_Access_Log: ['access_log_id','user_id','role','email','ip_address','ipv6_address','device_info','access_status','reason','timestamp'],
  Audit_Log: ['audit_id','user_id','user_email','user_role','action','entity_type','entity_id','old_value','new_value','ip_address','device_info','timestamp'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rowToObject(headers: string[], row: (string | null | undefined)[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
  return obj;
}

function objectToRow(headers: string[], obj: Record<string, unknown>): string[] {
  return headers.map(h => {
    const v = obj[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function getAllRows<T = Record<string, string>>(sheetName: string): Promise<T[]> {
  const sheets = getSheetsClient();
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID(), range: `${sheetName}!A2:ZZ` });
  const rows = res.data.values || [];
  return rows.map(r => rowToObject(headers, r) as T);
}

export async function appendRow(sheetName: string, obj: Record<string, unknown>): Promise<void> {
  const sheets = getSheetsClient();
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  const row = objectToRow(headers, obj);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function findRowIndex(sheetName: string, idField: string, idValue: string): Promise<number> {
  const sheets = getSheetsClient();
  const headers = SHEET_SCHEMAS[sheetName];
  const colIdx = headers.indexOf(idField);
  if (colIdx === -1) throw new Error(`Field ${idField} not in schema for ${sheetName}`);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID(), range: `${sheetName}!A:A` });
  const col = (await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID(), range: `${sheetName}!${String.fromCharCode(65 + colIdx)}:${String.fromCharCode(65 + colIdx)}` })).data.values || [];
  for (let i = 1; i < col.length; i++) {
    if (col[i]?.[0] === idValue) return i + 1; // 1-based, +1 for header
  }
  return -1;
}

export async function updateRowById(sheetName: string, idField: string, idValue: string, patch: Record<string, unknown>): Promise<Record<string, string> | null> {
  const sheets = getSheetsClient();
  const headers = SHEET_SCHEMAS[sheetName];
  const rowIndex = await findRowIndex(sheetName, idField, idValue);
  if (rowIndex === -1) return null;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID(), range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}` });
  const existing = rowToObject(headers, res.data.values?.[0] || []);
  const merged = { ...existing, ...patch } as Record<string, string>;
  const row = objectToRow(headers, merged);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  return merged;
}

export async function ensureHeaders(): Promise<void> {
  const sheets = getSheetsClient();
  const id = SPREADSHEET_ID();
  // Get existing sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const existingNames = (meta.data.sheets || []).map(s => s.properties?.title || '');
  const allNames = Object.keys(SHEET_SCHEMAS);

  const toCreate = allNames.filter(n => !existingNames.includes(n));
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: toCreate.map(title => ({ addSheet: { properties: { title } } })),
      },
    });
  }

  // Write headers
  for (const [name, headers] of Object.entries(SHEET_SCHEMAS)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${name}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });
  }
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
