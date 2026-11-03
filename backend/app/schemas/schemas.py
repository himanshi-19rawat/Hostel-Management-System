from datetime import datetime, date
from typing import Optional, List, Literal, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: Optional[str] = None
    user_id: int
    must_change_password: bool = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class FirstLoginPasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    must_change_password: bool = True
    created_at: datetime
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- User Management Schemas (Admin) ---
class UserAdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=5)
    role: Literal["admin", "warden", "accounts_staff", "student", "parent", "staff"]
    full_name: Optional[str] = None

class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[Literal["admin", "warden", "accounts_staff", "student", "parent", "staff"]] = None
    password: Optional[str] = Field(None, min_length=5)

# --- Student Profile Schemas ---
class StudentProfileBase(BaseModel):
    full_name: str
    registration_no: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[int] = None
    address: Optional[str] = None

class StudentProfileCreate(StudentProfileBase):
    email: EmailStr
    password: str = Field(..., min_length=5)

class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    registration_no: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[int] = None
    address: Optional[str] = None

class StudentContactUpdate(BaseModel):
    # What students themselves are permitted to edit
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None

class StudentProfileOut(StudentProfileBase):
    id: int
    user_id: int
    email: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: datetime
    updated_at: datetime
    current_room: Optional[str] = None

    class Config:
        from_attributes = True

# --- Room Schemas ---
class RoomBase(BaseModel):
    room_number: str
    block: str
    floor: int = 1
    capacity: int = 1
    room_type: str = "Standard"
    monthly_rate: float = 0.00
    status: Literal["available", "full", "maintenance"] = "available"

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    monthly_rate: Optional[float] = None
    status: Optional[Literal["available", "full", "maintenance"]] = None

class RoomOut(RoomBase):
    id: int
    created_at: datetime
    updated_at: datetime
    occupied_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Room Allocation Schemas ---
class RoomAllocationCreate(BaseModel):
    student_id: int
    room_id: int
    allocated_from: date
    allocated_to: Optional[date] = None
    remarks: Optional[str] = None

class RoomAllocationUpdate(BaseModel):
    allocated_to: Optional[date] = None
    status: Optional[Literal["active", "vacated"]] = None
    remarks: Optional[str] = None

class RoomAllocationOut(BaseModel):
    id: int
    student_id: int
    room_id: int
    student_name: Optional[str] = None
    room_number: Optional[str] = None
    block: Optional[str] = None
    allocated_from: date
    allocated_to: Optional[date] = None
    status: str
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Fee Record Schemas ---
class FeeRecordCreate(BaseModel):
    student_id: int
    fee_type: str
    amount_due: float
    due_date: date
    notes: Optional[str] = None

class FeeRecordUpdate(BaseModel):
    fee_type: Optional[str] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[Literal["pending", "partial", "paid", "overdue"]] = None
    payment_method: Optional[str] = None
    receipt_no: Optional[str] = None
    notes: Optional[str] = None

class FeePaymentCreate(BaseModel):
    amount_paying: float
    payment_method: str
    receipt_no: Optional[str] = None
    notes: Optional[str] = None

class FeeRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    fee_type: str
    amount_due: float
    amount_paid: float
    due_date: date
    status: str
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    receipt_no: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notice Schemas ---
class NoticeCreate(BaseModel):
    title: str
    content: str
    target_role: str = "all"
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    expires_at: Optional[datetime] = None
    is_pinned: bool = False

class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    target_role: Optional[str] = None
    priority: Optional[Literal["low", "normal", "high", "urgent"]] = None
    expires_at: Optional[datetime] = None
    is_pinned: Optional[bool] = None

class NoticeOut(BaseModel):
    id: int
    author_id: int
    author_name: Optional[str] = None
    title: str
    content: str
    target_role: str
    priority: str
    published_at: datetime
    expires_at: Optional[datetime] = None
    is_pinned: bool

    class Config:
        from_attributes = True

# --- Calendar Event Schemas ---
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: Literal["meeting", "inspection", "payment_deadline", "holiday", "maintenance", "other"] = "other"
    start_date: datetime
    end_date: Optional[datetime] = None
    target_role: str = "all"

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[Literal["meeting", "inspection", "payment_deadline", "holiday", "maintenance", "other"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_role: Optional[str] = None

class CalendarEventOut(BaseModel):
    id: int
    created_by: int
    creator_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    event_type: str
    start_date: datetime
    end_date: Optional[datetime] = None
    target_role: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Issue Request Schemas ---
class IssueRequestCreate(BaseModel):
    category: Literal["plumbing", "electrical", "carpentry", "cleanliness", "room_change", "other"]
    title: str
    description: str
    priority: Literal["low", "medium", "high"] = "medium"

class IssueStatusUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved", "rejected"]
    resolution_remarks: Optional[str] = None

class IssueRequestOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    room_number: Optional[str] = None
    category: str
    title: str
    description: str
    priority: str
    status: str
    resolution_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- User Usability Settings ---
class UserSettingsUpdate(BaseModel):
    theme: Optional[Literal["light", "dark", "system"]] = None
    high_contrast: Optional[bool] = None
    font_size: Optional[Literal["small", "medium", "large"]] = None
    compact_tables: Optional[bool] = None

class UserSettingsOut(BaseModel):
    theme: str
    high_contrast: bool
    font_size: str
    compact_tables: bool

    class Config:
        from_attributes = True

# --- Hostel Configuration Settings ---
class HostelSettingsUpdate(BaseModel):
    hostel_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    rules_policy: Optional[str] = None

class HostelSettingsOut(BaseModel):
    hostel_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    rules_policy: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Dashboard & Operational Summary Schemas ---
class OperationalSummaryOut(BaseModel):
    total_students: int
    total_rooms: int
    total_capacity: int
    occupied_beds: int
    vacant_beds: int
    occupancy_rate_percent: float
    total_dues_outstanding: float
    total_collected: float
    pending_issues_count: int
    active_notices_count: int
    upcoming_events_count: int

# --- TQM Quality Framework Schemas ---

class TqmVoCCreate(BaseModel):
    stakeholder_type: Optional[Literal["student", "warden", "staff", "admin"]] = None
    feedback_category: str
    customer_verbatim: str
    key_issue: str
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    usability_metric: Optional[str] = None

class TqmVoCOut(BaseModel):
    id: int
    user_id: int
    stakeholder_type: str
    feedback_category: str
    customer_verbatim: str
    key_issue: str
    satisfaction_rating: Optional[int] = None
    usability_metric: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TqmCtqCreate(BaseModel):
    need_statement: str
    quality_driver: str
    ctq_metric: str
    target_specification: str
    lower_limit: Optional[str] = None
    upper_limit: Optional[str] = None

class TqmCtqOut(TqmCtqCreate):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class TqmSipocCreate(BaseModel):
    process_name: str
    supplier: str
    inputs: str
    process_steps: str
    outputs: str
    customer: str

class TqmSipocOut(TqmSipocCreate):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class TqmFmeaCreate(BaseModel):
    process_step: str
    potential_failure_mode: str
    potential_effect: str
    severity: int = Field(..., ge=1, le=10)
    potential_cause: str
    occurrence: int = Field(..., ge=1, le=10)
    current_controls: str
    detection: int = Field(..., ge=1, le=10)
    recommended_action: Optional[str] = None
    action_taken: Optional[str] = None

class TqmFmeaOut(TqmFmeaCreate):
    id: int
    rpn: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TqmDefectCreate(BaseModel):
    title: str
    description: str
    defect_type: Literal["usability", "functional", "data_error", "ui_display", "performance", "security"] = "usability"
    severity: Literal["critical", "major", "minor", "cosmetic"] = "minor"

class TqmDefectUpdate(BaseModel):
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    status: Optional[Literal["logged", "analyzing", "in_remediation", "verified_closed"]] = None

class TqmDefectOut(BaseModel):
    id: int
    title: str
    description: str
    defect_type: str
    severity: str
    reported_by: int
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TqmPdcaCreate(BaseModel):
    cycle_name: str
    target_objective: str
    plan_stage: str
    do_stage: Optional[str] = None
    check_stage: Optional[str] = None
    act_stage: Optional[str] = None
    status: Literal["plan", "do", "check", "act", "standardized"] = "plan"

class TqmPdcaUpdate(BaseModel):
    target_objective: Optional[str] = None
    plan_stage: Optional[str] = None
    do_stage: Optional[str] = None
    check_stage: Optional[str] = None
    act_stage: Optional[str] = None
    status: Optional[Literal["plan", "do", "check", "act", "standardized"]] = None

class TqmPdcaOut(BaseModel):
    id: int
    cycle_name: str
    target_objective: str
    plan_stage: str
    do_stage: Optional[str] = None
    check_stage: Optional[str] = None
    act_stage: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceRecordItem(BaseModel):
    student_id: int
    status: Literal["present", "absent"]
    remarks: Optional[str] = None

class AttendanceMarkRequest(BaseModel):
    date: date
    records: List[AttendanceRecordItem]

class AttendanceUpdate(BaseModel):
    status: Literal["present", "absent"]
    remarks: Optional[str] = None

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    date: date
    status: str
    remarks: Optional[str] = None
    marked_by: int
    marked_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AttendanceStudentSummary(BaseModel):
    total_days: int
    present_count: int
    absent_count: int
    attendance_percentage: float

# --- Student Requests (Leave & Outpass) Schemas ---
class StudentRequestCreate(BaseModel):
    request_type: Literal["leave", "outpass"]
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: str

class StudentRequestStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    decision_remarks: Optional[str] = None

class StudentRequestOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    room_number: Optional[str] = None
    request_type: str
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: str
    status: str
    decision_remarks: Optional[str] = None
    action_by: Optional[int] = None
    action_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Mess Inventory Schemas ---
class MessInventoryCreate(BaseModel):
    item_name: str
    category: str
    quantity: float
    unit: str
    min_threshold: Optional[float] = 0.0
    unit_price: Optional[float] = None
    notes: Optional[str] = None

class MessInventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    min_threshold: Optional[float] = None
    unit_price: Optional[float] = None
    notes: Optional[str] = None

class MessInventoryOut(BaseModel):
    id: int
    item_name: str
    category: str
    quantity: float
    unit: str
    min_threshold: Optional[float] = None
    unit_price: Optional[float] = None
    notes: Optional[str] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# Student Activity & Check-In/Check-Out Schemas
# ========================================================

class StudentActivityLogCreate(BaseModel):
    student_id: int
    activity_type: Literal["check_in", "check_out"]
    location: Optional[str] = "Main Gate"
    timestamp: Optional[datetime] = None
    remarks: Optional[str] = None


class StudentActivityLogOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    room_number: Optional[str] = None
    activity_type: str
    timestamp: datetime
    location: str
    recorded_by: Optional[int] = None
    recorded_by_name: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentStatusOut(BaseModel):
    student_id: int
    student_name: str
    registration_no: Optional[str] = None
    department: Optional[str] = None
    room_number: Optional[str] = None
    current_status: Literal["checked_in", "checked_out", "on_leave"]
    status_label: str
    latest_activity: Optional[StudentActivityLogOut] = None
    active_leave: Optional[StudentRequestOut] = None
    last_seen_location: Optional[str] = None
    last_seen_time: Optional[datetime] = None


class ParentStudentLinkCreate(BaseModel):
    student_id: int
    parent_user_id: int
    relationship: Optional[str] = "Parent"


class ParentStudentLinkOut(BaseModel):
    id: int
    parent_user_id: int
    parent_email: Optional[str] = None
    parent_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_registration_no: Optional[str] = None
    relationship: str
    created_at: datetime

    class Config:
        from_attributes = True
