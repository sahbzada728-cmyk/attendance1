import { z } from 'zod';

export const attendanceOverrideSchema = z.object({
  employee_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['Present', 'Late', 'Absent', 'No Attendance Entry', 'CEO Override']),
  override_reason: z.string().min(5, 'Override reason must be at least 5 characters'),
});

export const commitmentSchema = z.object({
  planned_task: z.string().min(3, 'Planned task is required'),
  expected_output: z.string().min(3, 'Expected output is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  estimated_completion_time: z.string().min(1, 'Estimated completion time required'),
  notes: z.string().optional().default(''),
});

export const taskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().min(3, 'Task description is required'),
  assigned_to: z.string().min(1, 'Must assign to an employee'),
  department: z.string().optional().default(''),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid due date'),
  attachment_links: z.string().optional().default(''),
});

export const subtaskSchema = z.object({
  task_id: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional().default(''),
  assigned_to: z.string().min(1),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  status: z.string().optional().default('Assigned'),
  progress_percent: z.number().min(0).max(100).optional().default(0),
});

export const commentSchema = z.object({
  task_id: z.string().min(1),
  subtask_id: z.string().optional().default(''),
  comment_text: z.string().min(1, 'Comment text required'),
});

export const progressSchema = z.object({
  task_id: z.string().min(1),
  progress_status: z.enum(['Work Done', 'In Progress', 'No Activity Today', 'Blocked', 'Ready for Review']),
  progress_description: z.string().optional().default(''),
  no_activity_reason: z.string().optional().default(''),
  blocker_reason: z.string().optional().default(''),
}).superRefine((d, ctx) => {
  if (d.progress_status === 'No Activity Today' && !d.no_activity_reason?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reason is required when No Activity Today is selected', path: ['no_activity_reason'] });
  }
  if (d.progress_status === 'Blocked' && !d.blocker_reason?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Blocker reason is required when Blocked is selected', path: ['blocker_reason'] });
  }
});

export const holidaySchema = z.object({
  holiday_name: z.string().min(2),
  holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holiday_type: z.enum(['Pakistan Public Holiday', 'Company Holiday', 'Optional Holiday', 'Special Closure']),
  country: z.string().optional().default('Pakistan'),
  is_working_day: z.boolean().optional().default(false),
});

export const officeSettingsSchema = z.object({
  office_start_time: z.string().regex(/^\d{2}:\d{2}$/),
  office_end_time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  attendance_grace_minutes: z.number().min(0).max(120),
  progress_report_window_minutes: z.number().min(10).max(120),
  weekly_off_day: z.string().min(1),
  employee_ip_restriction_enabled: z.boolean(),
  allowed_public_ipv4_addresses: z.string().min(1),
  allowed_ipv6_prefixes: z.string().optional().default(''),
  ceo_any_ip_login_enabled: z.boolean(),
  testing_mode: z.boolean(),
  emergency_override_enabled: z.boolean(),
});

export const employeeSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role_position: z.string().min(1),
  department: z.string().min(1),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
  ssid: z.string().optional().default(''),
  local_ipv4_address: z.string().optional().default(''),
  mac_address: z.string().optional().default(''),
  observed_ipv6_prefix: z.string().optional().default(''),
});
