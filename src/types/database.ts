export type Employee = {
  employee_id: string
  employee_no: string
  full_name: string
  email: string
  role_position: string
  department: string
  status: string
  created_at: string
  updated_at: string
}

export type Task = {
  task_id: string
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string | null
  priority: string
  status: string
  due_date: string | null
  created_at: string
  updated_at: string
}

export type Attendance = {
  attendance_id: string
  employee_id: string
  date: string
  time_in: string | null
  status: string | null
  ip_address: string | null
  created_at: string
}

// Add more types as needed