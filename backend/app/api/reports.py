from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user
from app.models.models import (
    User, StudentProfile, Room, RoomAllocation, FeeRecord,
    IssueRequest, Notice, CalendarEvent
)
from app.schemas.schemas import OperationalSummaryOut

router = APIRouter(prefix="/reports", tags=["Operational Summaries & Reports"])

@router.get("/summary", response_model=OperationalSummaryOut)
def get_operational_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total students registered
    total_students = db.query(func.count(StudentProfile.id)).scalar() or 0
    
    # Room statistics
    total_rooms = db.query(func.count(Room.id)).scalar() or 0
    raw_capacity = db.query(func.sum(Room.capacity)).scalar() or 0
    total_capacity = int(raw_capacity)
    occupied_beds = db.query(func.count(RoomAllocation.id)).filter(RoomAllocation.status == "active").scalar() or 0
    vacant_beds = max(0, total_capacity - occupied_beds) if total_capacity > 0 else 0
    occupancy_rate = (float(occupied_beds) / float(total_capacity) * 100.0) if total_capacity > 0 else 0.0

    # Financial statistics
    if current_user.role == "student":
        # Only own statistics for student
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        student_id = profile.id if profile else -1
        dues = db.query(func.sum(FeeRecord.amount_due - FeeRecord.amount_paid)).filter(
            FeeRecord.student_id == student_id,
            FeeRecord.status.in_(["pending", "partial", "overdue"])
        ).scalar() or 0.0
        collected = db.query(func.sum(FeeRecord.amount_paid)).filter(
            FeeRecord.student_id == student_id
        ).scalar() or 0.0
        pending_issues = db.query(func.count(IssueRequest.id)).filter(
            IssueRequest.student_id == student_id,
            IssueRequest.status.in_(["open", "in_progress"])
        ).scalar() or 0
    elif current_user.role == "parent":
        from app.models.models import ParentStudentLink
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        total_students = len(student_ids)
        total_rooms = len(student_ids)
        total_capacity = len(student_ids)
        occupied_beds = len(student_ids)
        vacant_beds = 0
        occupancy_rate = 100.0 if total_students > 0 else 0.0
        dues = 0.0
        collected = 0.0
        pending_issues = 0
    elif current_user.role in ("staff", "accounts_staff"):
        # Staff operational overview (non-financial)
        dues = 0.0
        collected = 0.0
        pending_issues = db.query(func.count(IssueRequest.id)).filter(
            IssueRequest.status.in_(["open", "in_progress"])
        ).scalar() or 0
    else:
        # Full operational metrics for Management (Warden, Admin)
        total_due_sum = db.query(func.sum(FeeRecord.amount_due)).scalar() or 0.0
        total_paid_sum = db.query(func.sum(FeeRecord.amount_paid)).scalar() or 0.0
        dues = max(0.0, float(total_due_sum) - float(total_paid_sum))
        collected = float(total_paid_sum)
        pending_issues = db.query(func.count(IssueRequest.id)).filter(
            IssueRequest.status.in_(["open", "in_progress"])
        ).scalar() or 0

    active_notices = db.query(func.count(Notice.id)).scalar() or 0
    upcoming_events = db.query(func.count(CalendarEvent.id)).scalar() or 0

    return OperationalSummaryOut(
        total_students=total_students,
        total_rooms=total_rooms,
        total_capacity=int(total_capacity),
        occupied_beds=occupied_beds,
        vacant_beds=vacant_beds,
        occupancy_rate_percent=round(occupancy_rate, 1),
        total_dues_outstanding=round(float(dues), 2),
        total_collected=round(collected, 2),
        pending_issues_count=pending_issues,
        active_notices_count=active_notices,
        upcoming_events_count=upcoming_events
    )
