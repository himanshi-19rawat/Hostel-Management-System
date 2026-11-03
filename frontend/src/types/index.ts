export type UserRole = 'admin' | 'warden' | 'student' | 'parent' | 'staff' | 'accounts_staff';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
  full_name?: string | null;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  email?: string | null;
  is_active?: boolean;
  full_name: string;
  registration_no?: string | null;
  roll_number?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  department?: string | null;
  year_of_study?: number | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
  current_room?: string | null;
}

export interface Room {
  id: number;
  room_number: string;
  block: string;
  floor: number;
  capacity: number;
  room_type: string;
  monthly_rate: number;
  status: 'available' | 'full' | 'maintenance';
  created_at: string;
  updated_at: string;
  occupied_count?: number;
}

export interface RoomAllocation {
  id: number;
  student_id: number;
  room_id: number;
  student_name?: string | null;
  room_number?: string | null;
  block?: string | null;
  allocated_from: string;
  allocated_to?: string | null;
  status: 'active' | 'vacated';
  remarks?: string | null;
  created_at: string;
}

export interface FeeRecord {
  id: number;
  student_id: number;
  student_name?: string | null;
  fee_type: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  payment_date?: string | null;
  payment_method?: string | null;
  receipt_no?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Notice {
  id: number;
  author_id: number;
  author_name?: string | null;
  title: string;
  content: string;
  target_role: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published_at: string;
  expires_at?: string | null;
  is_pinned: boolean;
}

export interface CalendarEvent {
  id: number;
  created_by: number;
  creator_name?: string | null;
  title: string;
  description?: string | null;
  event_type: 'meeting' | 'inspection' | 'payment_deadline' | 'holiday' | 'maintenance' | 'other';
  start_date: string;
  end_date?: string | null;
  target_role: string;
  created_at: string;
}

export interface IssueRequest {
  id: number;
  student_id: number;
  student_name?: string | null;
  room_number?: string | null;
  category: 'plumbing' | 'electrical' | 'carpentry' | 'cleanliness' | 'room_change' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  resolution_remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  high_contrast: boolean;
  font_size: 'small' | 'medium' | 'large';
  compact_tables: boolean;
}

export interface HostelSettings {
  hostel_name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  rules_policy?: string | null;
  updated_at?: string;
}

export interface OperationalSummary {
  total_students: number;
  total_rooms: number;
  total_capacity: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate_percent: number;
  total_dues_outstanding: number;
  total_collected: number;
  pending_issues_count: number;
  active_notices_count: number;
  upcoming_events_count: number;
}

// ========================================================
// TQM Interfaces
// ========================================================

export interface TqmVoC {
  id: number;
  user_id: number;
  stakeholder_type: 'student' | 'warden' | 'staff' | 'admin';
  feedback_category: string;
  customer_verbatim: string;
  key_issue: string;
  satisfaction_rating?: number | null;
  usability_metric?: string | null;
  created_at: string;
}

export interface TqmCtq {
  id: number;
  need_statement: string;
  quality_driver: string;
  ctq_metric: string;
  target_specification: string;
  lower_limit?: string | null;
  upper_limit?: string | null;
  created_by: number;
  created_at: string;
}

export interface TqmSipoc {
  id: number;
  process_name: string;
  supplier: string;
  inputs: string;
  process_steps: string;
  outputs: string;
  customer: string;
  created_by: number;
  created_at: string;
}

export interface TqmFmea {
  id: number;
  process_step: string;
  potential_failure_mode: string;
  potential_effect: string;
  severity: number;
  potential_cause: string;
  occurrence: number;
  current_controls: string;
  detection: number;
  rpn: number;
  recommended_action?: string | null;
  action_taken?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TqmDefect {
  id: number;
  title: string;
  description: string;
  defect_type: 'usability' | 'functional' | 'data_error' | 'ui_display' | 'performance' | 'security';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  reported_by: number;
  root_cause?: string | null;
  corrective_action?: string | null;
  status: 'logged' | 'analyzing' | 'in_remediation' | 'verified_closed';
  created_at: string;
  updated_at: string;
}

export interface TqmPdca {
  id: number;
  cycle_name: string;
  target_objective: string;
  plan_stage: string;
  do_stage?: string | null;
  check_stage?: string | null;
  act_stage?: string | null;
  status: 'plan' | 'do' | 'check' | 'act' | 'standardized';
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ========================================================
// Attendance, Requests & Inventory Interfaces
// ========================================================

export interface StudentAttendance {
  id: number;
  student_id: number;
  student_name?: string | null;
  date: string;
  status: 'present' | 'absent';
  remarks?: string | null;
  marked_by: number;
  marked_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  total_days: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface StudentRequest {
  id: number;
  student_id: number;
  student_name?: string | null;
  room_number?: string | null;
  request_type: 'leave' | 'outpass';
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decision_remarks?: string | null;
  action_by?: number | null;
  action_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface MessInventory {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold?: number | null;
  unit_price?: number | null;
  notes?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}


export interface StudentActivityLog {
  id: number;
  student_id: number;
  student_name?: string | null;
  room_number?: string | null;
  roll_number?: string | null;
  registration_no?: string | null;
  activity_type: 'check_in' | 'check_out';
  timestamp: string;
  location: string;
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  recorder_name?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface StudentStatus {
  student_id: number;
  student_name: string;
  registration_no?: string | null;
  roll_number?: string | null;
  department?: string | null;
  room_number?: string | null;
  current_status: 'checked_in' | 'checked_out' | 'on_leave';
  status_label: string;
  latest_activity?: StudentActivityLog | null;
  active_leave?: StudentRequest | null;
  last_seen_location?: string | null;
  last_seen_time?: string | null;
}

export interface ParentStudentLink {
  id: number;
  parent_user_id: number;
  parent_email?: string | null;
  parent_name?: string | null;
  student_id: number;
  student_name?: string | null;
  student_registration_no?: string | null;
  student_roll?: string | null;
  relationship: string;
  created_at: string;
}
