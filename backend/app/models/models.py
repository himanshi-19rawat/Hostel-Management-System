from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Time,
    Numeric, Text, Enum, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("admin", "warden", "student", "parent", "staff", "accounts_staff", name="user_roles"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    staff_profile = relationship("StaffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notices_authored = relationship("Notice", back_populates="author", cascade="all, delete-orphan")
    events_created = relationship("CalendarEvent", back_populates="creator", cascade="all, delete-orphan")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    registration_no = Column(String(50), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    year_of_study = Column(Integer, nullable=True)
    address = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    course = Column(String(100), nullable=True, default="Computer Science & Engineering")
    academic_year = Column(String(50), nullable=True, default="2024-2025")
    admission_date = Column(Date, nullable=True)
    hostel_joining_date = Column(Date, nullable=True)
    blood_group = Column(String(10), nullable=True, default="O+")
    current_status = Column(
        Enum('present_in_hostel', 'outside_hostel', 'on_approved_leave', 'gate_pass_issued', 'leave_pending_approval', 'overdue_return', 'permanently_checked_out', 'inactive_admission', name="student_current_status"),
        default='present_in_hostel',
        nullable=False
    )
    emergency_info = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="student_profile")
    allocations = relationship("RoomAllocation", back_populates="student", cascade="all, delete-orphan")
    fees = relationship("FeeRecord", back_populates="student", cascade="all, delete-orphan")
    issues = relationship("IssueRequest", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("StudentAttendance", back_populates="student", cascade="all, delete-orphan")
    requests = relationship("StudentRequest", back_populates="student", cascade="all, delete-orphan")
    activity_logs = relationship("StudentActivityLog", back_populates="student", cascade="all, delete-orphan")
    parent_links = relationship("ParentStudentLink", back_populates="student", cascade="all, delete-orphan")
    gate_passes = relationship("GatePass", back_populates="student", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_number = Column(String(20), unique=True, nullable=False)
    hostel_name = Column(String(100), default="Main Campus Hostel", nullable=False)
    block = Column(String(50), nullable=False)
    floor = Column(Integer, default=1, nullable=False)
    capacity = Column(Integer, default=1, nullable=False)
    room_type = Column(String(50), default="Standard", nullable=False)
    monthly_rate = Column(Numeric(10, 2), default=0.00, nullable=False)
    status = Column(Enum("available", "full", "maintenance", name="room_statuses"), default="available", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    allocations = relationship("RoomAllocation", back_populates="room")


class RoomAllocation(Base):
    __tablename__ = "room_allocations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False)
    bed_number = Column(String(20), default="Bed 1", nullable=False)
    allocated_from = Column(Date, nullable=False)
    allocated_to = Column(Date, nullable=True)
    status = Column(Enum("active", "vacated", name="allocation_statuses"), default="active", nullable=False, index=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="allocations")
    room = relationship("Room", back_populates="allocations")


class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    fee_type = Column(String(50), nullable=False)
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0.00, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(Enum("pending", "partial", "paid", "overdue", name="fee_statuses"), default="pending", nullable=False, index=True)
    payment_date = Column(DateTime, nullable=True)
    payment_method = Column(String(50), nullable=True)
    receipt_no = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="fees")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    target_role = Column(String(50), default="all", nullable=False)
    priority = Column(Enum("low", "normal", "high", "urgent", name="notice_priorities"), default="normal", nullable=False)
    published_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    author = relationship("User", back_populates="notices_authored")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(Enum("meeting", "inspection", "payment_deadline", "holiday", "maintenance", "other", name="event_types"), default="other", nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    target_role = Column(String(50), default="all", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="events_created")


class IssueRequest(Base):
    __tablename__ = "issue_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    category = Column(Enum("plumbing", "electrical", "carpentry", "cleanliness", "room_change", "other", name="issue_categories"), default="other", nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum("low", "medium", "high", name="issue_priorities"), default="medium", nullable=False)
    status = Column(Enum("open", "in_progress", "resolved", "rejected", name="issue_statuses"), default="open", nullable=False, index=True)
    assigned_staff_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_deadline = Column(Date, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="issues")
    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id])


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(String(20), default="light", nullable=False)
    high_contrast = Column(Boolean, default=False, nullable=False)
    font_size = Column(String(20), default="medium", nullable=False)
    compact_tables = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="settings")


class HostelSetting(Base):
    __tablename__ = "hostel_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hostel_name = Column(String(100), default="", nullable=False)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    rules_policy = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ========================================================
# Student Attendance, Leave & Outpass, Mess Inventory
# ========================================================

class StudentAttendance(Base):
    __tablename__ = "student_attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_student_date_attendance"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    status = Column(Enum("present", "absent", name="attendance_statuses"), nullable=False)
    remarks = Column(String(255), nullable=True)
    marked_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="attendance_records")
    marker = relationship("User")


class StudentRequest(Base):
    __tablename__ = "student_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(Enum("leave", "outpass", name="student_request_types"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(Enum("pending", "approved", "rejected", name="student_request_statuses"), default="pending", nullable=False, index=True)
    action_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision_remarks = Column(Text, nullable=True)
    action_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="requests")
    reviewer = relationship("User")


class MessInventory(Base):
    __tablename__ = "mess_inventory"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_name = Column(String(150), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    quantity = Column(Numeric(10, 2), default=0.00, nullable=False)
    unit = Column(String(50), nullable=False)
    min_threshold = Column(Numeric(10, 2), default=0.00, nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    updater = relationship("User")


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    parent_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column("relationship", String(50), default="Parent", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("parent_user_id", "student_id", name="uq_parent_student"),)

    parent_user = relationship("User", foreign_keys=[parent_user_id])
    student = relationship("StudentProfile", foreign_keys=[student_id], back_populates="parent_links")


class StudentActivityLog(Base):
    __tablename__ = "student_activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(Enum("check_in", "check_out", name="activity_types"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    location = Column(String(100), default="Main Gate", nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", foreign_keys=[student_id], back_populates="activity_logs")
    recorder = relationship("User", foreign_keys=[recorded_by])


# ========================================================
# TQM Models: VoC, CTQ, SIPOC, FMEA, Defects, PDCA
# ========================================================

class TqmVoC(Base):
    __tablename__ = "tqm_voc"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stakeholder_type = Column(Enum("student", "warden", "staff", "admin", name="stakeholder_types"), nullable=False)
    feedback_category = Column(String(100), nullable=False)
    customer_verbatim = Column(Text, nullable=False)
    key_issue = Column(String(255), nullable=False)
    satisfaction_rating = Column(Integer, nullable=True)
    usability_metric = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class TqmCtq(Base):
    __tablename__ = "tqm_ctq"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    need_statement = Column(String(255), nullable=False)
    quality_driver = Column(String(255), nullable=False)
    ctq_metric = Column(String(255), nullable=False)
    target_specification = Column(String(255), nullable=False)
    lower_limit = Column(String(100), nullable=True)
    upper_limit = Column(String(100), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User")


class TqmSipoc(Base):
    __tablename__ = "tqm_sipoc"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    process_name = Column(String(150), nullable=False)
    supplier = Column(Text, nullable=False)
    inputs = Column(Text, nullable=False)
    process_steps = Column(Text, nullable=False)
    outputs = Column(Text, nullable=False)
    customer = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User")


class TqmFmea(Base):
    __tablename__ = "tqm_fmea"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    process_step = Column(String(150), nullable=False)
    potential_failure_mode = Column(String(255), nullable=False)
    potential_effect = Column(String(255), nullable=False)
    severity = Column(Integer, nullable=False)
    potential_cause = Column(String(255), nullable=False)
    occurrence = Column(Integer, nullable=False)
    current_controls = Column(String(255), nullable=False)
    detection = Column(Integer, nullable=False)
    rpn = Column(Integer, nullable=False)
    recommended_action = Column(Text, nullable=True)
    action_taken = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User")


class TqmDefect(Base):
    __tablename__ = "tqm_defects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    defect_type = Column(Enum("usability", "functional", "data_error", "ui_display", "performance", "security", name="defect_types"), default="usability", nullable=False)
    severity = Column(Enum("critical", "major", "minor", "cosmetic", name="defect_severities"), default="minor", nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    root_cause = Column(Text, nullable=True)
    corrective_action = Column(Text, nullable=True)
    status = Column(Enum("logged", "analyzing", "in_remediation", "verified_closed", name="defect_statuses"), default="logged", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    reporter = relationship("User")


class TqmPdca(Base):
    __tablename__ = "tqm_pdca"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cycle_name = Column(String(150), nullable=False)
    target_objective = Column(String(255), nullable=False)
    plan_stage = Column(Text, nullable=False)
    do_stage = Column(Text, nullable=True)
    check_stage = Column(Text, nullable=True)
    act_stage = Column(Text, nullable=True)
    status = Column(Enum("plan", "do", "check", "act", "standardized", name="pdca_statuses"), default="plan", nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User")


class GatePass(Base):
    __tablename__ = "gate_passes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pass_number = Column(String(50), unique=True, nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    departure_date = Column(Date, nullable=False)
    departure_time = Column(Time, nullable=False)
    expected_return_date = Column(Date, nullable=False)
    expected_return_time = Column(Time, nullable=False)
    emergency_contact = Column(String(50), nullable=True)
    status = Column(Enum("pending", "approved", "rejected", "expired", "completed", "overdue", name="gate_pass_statuses"), default="pending", nullable=False, index=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    actual_exit_time = Column(DateTime, nullable=True)
    actual_return_time = Column(DateTime, nullable=True)
    verified_by_security = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_late = Column(Boolean, default=False, nullable=False)
    qr_data = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="gate_passes")
    approver = relationship("User", foreign_keys=[approved_by])
    security_verifier = relationship("User", foreign_keys=[verified_by_security])


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    designation = Column(String(100), default="General Staff", nullable=False)
    phone = Column(String(50), nullable=True)
    assigned_block = Column(String(50), nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="staff_profile")
