import {
  User, StudentProfile, Room, RoomAllocation, FeeRecord,
  Notice, CalendarEvent, IssueRequest, UserSettings,
  HostelSettings, OperationalSummary,
  TqmVoC, TqmCtq, TqmSipoc, TqmFmea, TqmDefect, TqmPdca,
  StudentAttendance, AttendanceSummary, StudentRequest, RequestStats, MessInventory,
  StudentActivityLog, StudentStatus, ParentStudentLink
} from '../types';

// Base API URL supports environment overrides or falls back to Vite proxy `/api`
const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  '/api'
).replace(/\/$/, '');

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hostel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...((options.headers as Record<string, string>) || {}),
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(`Network failure connecting to backend (${url}): ${netErr?.message || 'Server may be offline or unreachable.'}`);
  }

  if (response.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('hostel_token');
      localStorage.removeItem('hostel_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { detail: text } : null;
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    if (data && data.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI / Pydantic validation error array
        errorMsg = data.detail
          .map((err: any) => {
            const field = Array.isArray(err.loc) ? err.loc.filter((l: any) => l !== 'body').join('.') : '';
            return field ? `${field}: ${err.msg}` : err.msg;
          })
          .join(', ');
      } else if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else {
        errorMsg = JSON.stringify(data.detail);
      }
    } else if (response.status === 404) {
      errorMsg = `Endpoint '${cleanEndpoint}' was not found on server (HTTP 404).`;
    } else if (response.statusText) {
      errorMsg = `${response.statusText} (HTTP ${response.status})`;
    } else {
      errorMsg = `Request failed with HTTP status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // --- Auth ---
  login: (email: string, password: string) =>
    request<{ access_token: string; role: string; email: string; full_name: string; user_id: number; must_change_password: boolean }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  getCurrentUser: () => request<User>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),
  firstLoginChangePassword: (old_password: string, new_password: string) =>
    request<{ message: string }>('/auth/first-login-change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),

  // --- Users (Admin) ---
  getUsers: (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    return request<User[]>(`/users?${params.toString()}`);
  },
  createUser: (data: { email: string; password: string; role: string; full_name?: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: { is_active?: boolean; role?: string; password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // --- Students ---
  getStudents: (search?: string, department?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department) params.append('department', department);
    return request<StudentProfile[]>(`/students?${params.toString()}`);
  },
  getMyStudentProfile: () => request<StudentProfile>('/students/me'),
  updateMyContact: (data: { phone?: string; emergency_contact?: string; address?: string }) =>
    request<StudentProfile>('/students/me/contact', { method: 'PUT', body: JSON.stringify(data) }),
  getStudentDetail: (id: number) => request<StudentProfile>(`/students/${id}`),
  updateStudent: (id: number, data: Partial<StudentProfile>) =>
    request<StudentProfile>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // --- Rooms ---
  getRooms: (block?: string, status_filter?: string) => {
    const params = new URLSearchParams();
    if (block) params.append('block', block);
    if (status_filter) params.append('status_filter', status_filter);
    return request<Room[]>(`/rooms?${params.toString()}`);
  },
  createRoom: (data: Omit<Room, 'id' | 'created_at' | 'updated_at' | 'occupied_count'>) =>
    request<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: number, data: Partial<Room>) =>
    request<Room>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: number) => request<{ message: string }>(`/rooms/${id}`, { method: 'DELETE' }),

  // --- Room Allocations ---
  getAllocations: (status_filter?: string) => {
    const params = new URLSearchParams();
    if (status_filter) params.append('status_filter', status_filter);
    return request<RoomAllocation[]>(`/rooms/allocations/list?${params.toString()}`);
  },
  createAllocation: (data: { student_id: number; room_id: number; allocated_from: string; allocated_to?: string; remarks?: string }) =>
    request<RoomAllocation>('/rooms/allocations', { method: 'POST', body: JSON.stringify(data) }),
  updateAllocation: (id: number, data: { allocated_to?: string; status?: 'active' | 'vacated'; remarks?: string }) =>
    request<RoomAllocation>(`/rooms/allocations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // --- Fees ---
  getFees: (status_filter?: string, student_id?: number) => {
    const params = new URLSearchParams();
    if (status_filter) params.append('status_filter', status_filter);
    if (student_id) params.append('student_id', student_id.toString());
    return request<FeeRecord[]>(`/fees?${params.toString()}`);
  },
  createFee: (data: { student_id: number; fee_type: string; amount_due: number; due_date: string; notes?: string }) =>
    request<FeeRecord>('/fees', { method: 'POST', body: JSON.stringify(data) }),
  recordPayment: (id: number, data: { amount_paying: number; payment_method: string; receipt_no?: string; notes?: string }) =>
    request<FeeRecord>(`/fees/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),

  // --- Notices ---
  getNotices: (search?: string, priority?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (priority) params.append('priority', priority);
    return request<Notice[]>(`/notices?${params.toString()}`);
  },
  createNotice: (data: { title: string; content: string; target_role: string; priority: string; expires_at?: string; is_pinned: boolean }) =>
    request<Notice>('/notices', { method: 'POST', body: JSON.stringify(data) }),
  deleteNotice: (id: number) => request<{ message: string }>(`/notices/${id}`, { method: 'DELETE' }),

  // --- Calendar ---
  getEvents: (event_type?: string) => {
    const params = new URLSearchParams();
    if (event_type) params.append('event_type', event_type);
    return request<CalendarEvent[]>(`/calendar?${params.toString()}`);
  },
  createEvent: (data: { title: string; description?: string; event_type: string; start_date: string; end_date?: string; target_role: string }) =>
    request<CalendarEvent>('/calendar', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: number) => request<{ message: string }>(`/calendar/${id}`, { method: 'DELETE' }),

  // --- Issues ---
  getIssues: (status_filter?: string, category?: string) => {
    const params = new URLSearchParams();
    if (status_filter) params.append('status_filter', status_filter);
    if (category) params.append('category', category);
    return request<IssueRequest[]>(`/issues?${params.toString()}`);
  },
  submitIssue: (data: { category: string; title: string; description: string; priority: string }) =>
    request<IssueRequest>('/issues', { method: 'POST', body: JSON.stringify(data) }),
  updateIssueStatus: (id: number, status: string, resolution_remarks?: string) =>
    request<IssueRequest>(`/issues/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, resolution_remarks }) }),

  // --- Settings ---
  getUserSettings: () => request<UserSettings>('/settings/usability'),
  updateUserSettings: (data: Partial<UserSettings>) =>
    request<UserSettings>('/settings/usability', { method: 'PUT', body: JSON.stringify(data) }),
  getHostelSettings: () => request<HostelSettings>('/settings/hostel'),
  updateHostelSettings: (data: Partial<HostelSettings>) =>
    request<HostelSettings>('/settings/hostel', { method: 'PUT', body: JSON.stringify(data) }),

  // --- Reports & Summary ---
  getOperationalSummary: () => request<OperationalSummary>('/reports/summary'),

  // --- TQM Framework ---
  getVoC: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return request<TqmVoC[]>(`/tqm/voc?${params.toString()}`);
  },
  submitVoC: (data: { feedback_category: string; customer_verbatim: string; key_issue: string; satisfaction_rating?: number | null; usability_metric?: string }) =>
    request<TqmVoC>('/tqm/voc', { method: 'POST', body: JSON.stringify(data) }),

  getCtq: () => request<TqmCtq[]>('/tqm/ctq'),
  createCtq: (data: { need_statement: string; quality_driver: string; ctq_metric: string; target_specification: string; lower_limit?: string; upper_limit?: string }) =>
    request<TqmCtq>('/tqm/ctq', { method: 'POST', body: JSON.stringify(data) }),
  deleteCtq: (id: number) => request<{ message: string }>(`/tqm/ctq/${id}`, { method: 'DELETE' }),

  getSipoc: () => request<TqmSipoc[]>('/tqm/sipoc'),
  createSipoc: (data: { process_name: string; supplier: string; inputs: string; process_steps: string; outputs: string; customer: string }) =>
    request<TqmSipoc>('/tqm/sipoc', { method: 'POST', body: JSON.stringify(data) }),
  deleteSipoc: (id: number) => request<{ message: string }>(`/tqm/sipoc/${id}`, { method: 'DELETE' }),

  getFmea: () => request<TqmFmea[]>('/tqm/fmea'),
  createFmea: (data: { process_step: string; potential_failure_mode: string; potential_effect: string; severity: number; potential_cause: string; occurrence: number; current_controls: string; detection: number; recommended_action?: string; action_taken?: string }) =>
    request<TqmFmea>('/tqm/fmea', { method: 'POST', body: JSON.stringify(data) }),
  deleteFmea: (id: number) => request<{ message: string }>(`/tqm/fmea/${id}`, { method: 'DELETE' }),

  getDefects: (defect_type?: string, status_filter?: string) => {
    const params = new URLSearchParams();
    if (defect_type) params.append('defect_type', defect_type);
    if (status_filter) params.append('status_filter', status_filter);
    return request<TqmDefect[]>(`/tqm/defects?${params.toString()}`);
  },
  logDefect: (data: { title: string; description: string; defect_type: string; severity: string }) =>
    request<TqmDefect>('/tqm/defects', { method: 'POST', body: JSON.stringify(data) }),
  updateDefect: (id: number, data: { root_cause?: string; corrective_action?: string; status?: string }) =>
    request<TqmDefect>(`/tqm/defects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getPdca: (status_filter?: string) => {
    const params = new URLSearchParams();
    if (status_filter) params.append('status_filter', status_filter);
    return request<TqmPdca[]>(`/tqm/pdca?${params.toString()}`);
  },
  createPdca: (data: { cycle_name: string; target_objective: string; plan_stage: string; do_stage?: string; check_stage?: string; act_stage?: string; status?: string }) =>
    request<TqmPdca>('/tqm/pdca', { method: 'POST', body: JSON.stringify(data) }),
  updatePdca: (id: number, data: Partial<TqmPdca>) =>
    request<TqmPdca>(`/tqm/pdca/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePdca: (id: number) => request<{ message: string }>(`/tqm/pdca/${id}`, { method: 'DELETE' }),

  // --- Attendance ---
  getAttendance: (date?: string, student_id?: number) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (student_id) params.append('student_id', String(student_id));
    return request<StudentAttendance[]>(`/attendance?${params.toString()}`);
  },
  getAttendanceSummary: (student_id?: number) => {
    const params = new URLSearchParams();
    if (student_id) params.append('student_id', String(student_id));
    return request<AttendanceSummary>(`/attendance/summary?${params.toString()}`);
  },
  markAttendance: (data: { date: string; records: { student_id: number; status: 'present' | 'absent'; remarks?: string }[] }) =>
    request<{ message: string }>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  correctAttendance: (id: number, data: { status: 'present' | 'absent'; remarks?: string }) =>
    request<StudentAttendance>(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // --- Leave & Outpass Requests ---
  getRequests: (request_type?: string, status_filter?: string, student_id?: number) => {
    const params = new URLSearchParams();
    if (request_type) params.append('request_type', request_type);
    if (status_filter) params.append('status_filter', status_filter);
    if (student_id) params.append('student_id', String(student_id));
    return request<StudentRequest[]>(`/leave-outpass?${params.toString()}`);
  },
  getRequestStats: () => request<RequestStats>('/leave-outpass/stats'),
  createRequest: (data: { request_type: 'leave' | 'outpass'; start_date: string; end_date: string; start_time?: string; end_time?: string; reason: string }) =>
    request<StudentRequest>('/leave-outpass', { method: 'POST', body: JSON.stringify(data) }),
  updateRequestStatus: (id: number, data: { status: 'approved' | 'rejected'; decision_remarks?: string }) =>
    request<StudentRequest>(`/leave-outpass/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelRequest: (id: number) =>
    request<{ message: string }>(`/leave-outpass/${id}`, { method: 'DELETE' }),

  // --- Mess Inventory ---
  getInventory: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return request<MessInventory[]>(`/mess/inventory?${params.toString()}`);
  },
  createInventoryItem: (data: { item_name: string; category: string; quantity: number; unit: string; min_threshold?: number; unit_price?: number; notes?: string }) =>
    request<MessInventory>('/mess/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventoryItem: (id: number, data: Partial<MessInventory>) =>
    request<MessInventory>(`/mess/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInventoryItem: (id: number) =>
    request<{ message: string }>(`/mess/inventory/${id}`, { method: 'DELETE' }),

  // --- Student Activity & Campus Status ---
  getStudentsStatus: () => request<StudentStatus[]>('/activity/status'),
  getActivityLogs: (student_id?: number, activity_type?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (student_id) params.append('student_id', String(student_id));
    if (activity_type) params.append('activity_type', activity_type);
    if (limit) params.append('limit', String(limit));
    return request<StudentActivityLog[]>(`/activity/logs?${params.toString()}`);
  },
  recordActivity: (data: { student_id: number; activity_type: 'check_in' | 'check_out'; location?: string; timestamp?: string; remarks?: string }) =>
    request<StudentActivityLog>('/activity/log', { method: 'POST', body: JSON.stringify(data) }),
  getParentLinks: () => request<ParentStudentLink[]>('/activity/parent-links'),
  createParentLink: (data: { parent_user_id: number; student_id: number; relationship?: string }) =>
    request<ParentStudentLink>('/activity/parent-links', { method: 'POST', body: JSON.stringify(data) }),
  deleteParentLink: (id: number) =>
    request<{ message: string }>(`/activity/parent-links/${id}`, { method: 'DELETE' }),
};
