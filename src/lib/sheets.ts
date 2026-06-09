import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Map sheet names to table names (Supabase uses lowercase with underscores)
const TABLE_MAP: Record<string, string> = {
  Users: 'users',
  Employees: 'employees',
  Office_Settings: 'office_settings',
  Holidays: 'holidays',
  Attendance: 'attendance',
  Daily_Commitments: 'daily_commitments',
  Tasks: 'tasks',
  Subtasks: 'subtasks',
  Comments: 'comments',
  Daily_Task_Progress: 'daily_task_progress',
  Notifications: 'notifications',
  IP_Access_Log: 'ip_access_log',
  Audit_Log: 'audit_log',
}

function getTableName(sheetName: string): string {
  const table = TABLE_MAP[sheetName]
  if (!table) throw new Error(`Unknown sheet: ${sheetName}`)
  return table
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all rows from a table
 */
export async function getAllRows<T = Record<string, unknown>>(
  sheetName: string
): Promise<T[]> {
  const tableName = getTableName(sheetName)

  const { data, error } = await supabase.from(tableName).select('*')

  if (error) throw new Error(`Failed to fetch from ${tableName}: ${error.message}`)

  return (data || []) as T[]
}

/**
 * Append a new row
 */
export async function appendRow(
  sheetName: string,
  obj: Record<string, unknown>
): Promise<void> {
  const tableName = getTableName(sheetName)

  const { error } = await supabase.from(tableName).insert([obj])

  if (error) throw new Error(`Failed to insert into ${tableName}: ${error.message}`)
}

/**
 * Find row index by ID field (returns the ID value, not array index)
 * For Supabase, we just return the ID value directly
 */
export async function findRowIndex(
  sheetName: string,
  idField: string,
  idValue: string
): Promise<number> {
  const tableName = getTableName(sheetName)

  const { data, error } = await supabase
    .from(tableName)
    .select(idField)
    .eq(idField, idValue)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return -1 // No rows found
    throw new Error(`Failed to find row: ${error.message}`)
  }

  return data ? 1 : -1 // Return 1 if found, -1 if not
}

/**
 * Update row by ID
 */
export async function updateRowById(
  sheetName: string,
  idField: string,
  idValue: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const tableName = getTableName(sheetName)

  // First, fetch the existing row
  const { data: existing, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq(idField, idValue)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch row: ${fetchError.message}`)
  }

  // Merge with patch
  const merged = { ...existing, ...patch }

  // Update the row
  const { data, error: updateError } = await supabase
    .from(tableName)
    .update(merged)
    .eq(idField, idValue)
    .select()
    .single()

  if (updateError) throw new Error(`Failed to update ${tableName}: ${updateError.message}`)

  return data
}

/**
 * Ensure headers (not needed for Supabase, tables already exist)
 * Kept for compatibility but does nothing
 */
export async function ensureHeaders(): Promise<void> {
  // Tables are already created in Supabase via SQL migration
  // This is a no-op now
  console.log('Supabase tables are pre-created. No schema setup needed.')
}

/**
 * Generate a unique ID
 */
export function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}