// ─── Roles ───────────────────────────────────────────────────────────────────
export type Role = 'CEO_SUPER_ADMIN' | 'EMPLOYEE';

// ─── User / Employee ─────────────────────────────────────────────────────────
export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: Role;
  employee_id: string;
  is_active: boolean;
  can_login_from_any_ip: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  employee_id: string;
  employee_no: number;
  full_name: string;
  email: string;
  role_position: string;
  department: string;
  status: 'Active' | 'Inactive';
  office_timing_group: string;
  access_rule: string;
  ssid: string;
  wifi_protocol: string;
  network_band: string;
  local_ipv4_address: string;
  ipv4_dns: string;
  ipv6_addresses: string;
  observed_ipv6_prefix: string;
  adapter_manufacturer: string;
  adapter_description: string;
  driver_version: string;
  mac_address: string;
  created_at: string;
  updated_at: string;
}

// ─── Office Settings ─────────────────────────────────────────────────────────
export interface OfficeSettings {
  setting_id: string;
  office_start_time: string;
  office_end_time: string;
  timezone: string;
  attendance_grace_minutes: number;
  grace_period_configurable: boolean;
  progress_report_window_minutes: number;
  weekly_off_day: string;
  employee_ip_restriction_enabled: boolean;
  allowed_public_ipv4_addresses: string;
  allowed_ipv6_prefixes: string;
  ceo_any_ip_login_enabled: boolean;
  testing_mode: boolean;
  emergency_override_enabled: boolean;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Holiday ─────────────────────────────────────────────────────────────────
export interface Holiday {
  holiday_id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  country: string;
  is_working_day: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'No Attendance Entry' | 'CEO Override';

export interface Attendance {
  attendance_id: string;
  employee_id: string;
  date: string;
  time_in: string;
  status: AttendanceStatus;
  ip_address: string;
  ipv6_address: string;
  device_info: string;
  is_within_allowed_window: boolean;
  is_from_allowed_ip: boolean;
  override_by: string;
  override_reason: string;
  created_at: string;
  updated_at: string;
}

// ─── Daily Commitment ─────────────────────────────────────────────────────────
export interface DailyCommitment {
  commitment_id: string;
  employee_id: string;
  date: string;
  planned_task: string;
  expected_output: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimated_completion_time: string;
  notes: string;
  submitted_at: string;
  submitted_ip: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export type TaskStatus = 'Assigned' | 'In Progress' | 'Ready for Review' | 'Approved / Completed' | 'Rejected' | 'Blocked' | 'Overdue' | 'Cancelled';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  task_id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  department: string;
  priority: Priority;
  start_date: string;
  due_date: string;
  status: TaskStatus;
  final_approval_status: string;
  attachment_links: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
}

// ─── Subtask ──────────────────────────────────────────────────────────────────
export interface Subtask {
  subtask_id: string;
  task_id: string;
  title: string;
  description: string;
  assigned_to: string;
  due_date: string;
  priority: Priority;
  status: TaskStatus;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

// ─── Comment ──────────────────────────────────────────────────────────────────
export interface Comment {
  comment_id: string;
  task_id: string;
  subtask_id: string;
  user_id: string;
  user_role: Role;
  comment_text: string;
  edited: boolean;
  edit_history: string;
  created_at: string;
  updated_at: string;
}

// ─── Daily Task Progress ──────────────────────────────────────────────────────
export type ProgressStatus = 'Work Done' | 'In Progress' | 'No Activity Today' | 'Blocked' | 'Ready for Review';

export interface DailyTaskProgress {
  progress_id: string;
  task_id: string;
  employee_id: string;
  date: string;
  progress_status: ProgressStatus;
  progress_description: string;
  no_activity_reason: string;
  blocker_reason: string;
  submitted_at: string;
  submitted_ip: string;
  submitted_device: string;
  is_within_allowed_window: boolean;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  notification_id: string;
  employee_id: string;
  recipient_email: string;
  type: string;
  subject: string;
  message: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string;
  created_at: string;
}

// ─── IP Access Log ────────────────────────────────────────────────────────────
export type AccessStatus = 'Allowed' | 'Denied_Unapproved_Email' | 'Denied_Unapproved_IP' | 'Allowed_CEO_Bypass' | 'Allowed_Testing_Mode';

export interface IpAccessLog {
  access_log_id: string;
  user_id: string;
  role: string;
  email: string;
  ip_address: string;
  ipv6_address: string;
  device_info: string;
  access_status: AccessStatus;
  reason: string;
  timestamp: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  audit_id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  device_info: string;
  timestamp: string;
}
