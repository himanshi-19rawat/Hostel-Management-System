from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.core.permissions import (
    get_current_user,
    require_admin_or_warden,
    require_roles,
)
from app.models.models import (
    User, StudentProfile, RoomAllocation, Room,
    StudentRequest, StudentActivityLog, ParentStudentLink
)
from app.schemas.schemas import (
    StudentActivityLogCreate, StudentActivityLogOut,
    StudentStatusOut, StudentRequestOut,
    ParentStudentLinkCreate, ParentStudentLinkOut
)

router = APIRouter(prefix="/activity", tags=["Student Activity & Map Tracking"])


def _get_active_room_str(db: Session, student_id: int) -> Optional[str]:
    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == student_id,
        RoomAllocation.status == "active"
    ).first()
    if alloc and alloc.room:
        return f"{alloc.room.block} - {alloc.room.room_number}"
    return None


def _build_log_out(log: StudentActivityLog, student: Optional[StudentProfile] = None, room_no: Optional[str] = None) -> StudentActivityLogOut:
    s_name = student.full_name if student else (log.student.full_name if log.student else None)
    rec_name = log.recorder.email if log.recorder else None
    return StudentActivityLogOut(
        id=log.id,
        student_id=log.student_id,
        student_name=s_name,
        room_number=room_no,
        activity_type=log.activity_type,
        timestamp=log.timestamp,
        location=log.location,
        recorded_by=log.recorded_by,
        recorded_by_name=rec_name,
        remarks=log.remarks,
        created_at=log.created_at
    )


def _get_student_status(db: Session, student: StudentProfile, today: date) -> StudentStatusOut:
    room_no = _get_active_room_str(db, student.id)

    # 1. Check student's leave/outpass records
    active_leave_req = db.query(StudentRequest).filter(
        StudentRequest.student_id == student.id,
        StudentRequest.request_type.in_(["leave", "outpass"])
    ).order_by(desc(StudentRequest.id)).first()

    leave_out = None
    is_currently_on_leave = False
    if active_leave_req:
        leave_out = StudentRequestOut(
            id=active_leave_req.id,
            student_id=active_leave_req.student_id,
            student_name=student.full_name,
            room_number=room_no,
            request_type=active_leave_req.request_type,
            start_date=active_leave_req.start_date,
            end_date=active_leave_req.end_date,
            start_time=active_leave_req.start_time,
            end_time=active_leave_req.end_time,
            reason=active_leave_req.reason,
            status=active_leave_req.status,
            decision_remarks=active_leave_req.decision_remarks,
            action_by=active_leave_req.action_by,
            action_at=active_leave_req.action_at,
            created_at=active_leave_req.created_at,
            updated_at=active_leave_req.updated_at
        )
        if active_leave_req.status == "approved" and active_leave_req.request_type == "leave" and active_leave_req.start_date <= today <= active_leave_req.end_date:
            is_currently_on_leave = True

    # 2. Query latest check-in / check-out activity
    latest_log = db.query(StudentActivityLog).filter(
        StudentActivityLog.student_id == student.id
    ).order_by(desc(StudentActivityLog.timestamp), desc(StudentActivityLog.id)).first()

    latest_log_out = _build_log_out(latest_log, student, room_no) if latest_log else None

    if is_currently_on_leave and active_leave_req:
        current_status = "on_leave"
        status_label = "On Approved Leave"
        last_seen_loc = f"Leave (Departed: {active_leave_req.start_date})"
        last_seen_t = latest_log.timestamp if latest_log else datetime.combine(active_leave_req.start_date, datetime.min.time())
    elif latest_log:
        current_status = "checked_in" if latest_log.activity_type == "check_in" else "checked_out"
        status_label = "Checked In" if latest_log.activity_type == "check_in" else "Checked Out"
        last_seen_loc = latest_log.location
        last_seen_t = latest_log.timestamp
    else:
        current_status = "checked_in"
        status_label = "Checked In (Hostel)"
        last_seen_loc = f"Hostel Room ({room_no})" if room_no else "Hostel Premises"
        last_seen_t = student.created_at

    return StudentStatusOut(
        student_id=student.id,
        student_name=student.full_name,
        registration_no=student.registration_no,
        department=student.department,
        room_number=room_no,
        current_status=current_status,
        status_label=status_label,
        latest_activity=latest_log_out,
        active_leave=leave_out,
        last_seen_location=last_seen_loc,
        last_seen_time=last_seen_t
    )


@router.get("/status", response_model=List[StudentStatusOut])
def get_students_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current activity and map status of students.
    - Admin, Warden, Staff: Can view all students.
    - Student: Can view only their own status.
    - Parent: Can view only their linked student(s)' status.
    """
    today = date.today()
    students_query = db.query(StudentProfile)

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return []
        students = [profile]
    elif current_user.role == "parent":
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        if not student_ids:
            return []
        students = students_query.filter(StudentProfile.id.in_(student_ids)).all()
    elif current_user.role in ("admin", "warden", "staff", "accounts_staff"):
        students = students_query.order_by(StudentProfile.full_name.asc()).all()
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return [_get_student_status(db, s, today) for s in students]


@router.get("/logs", response_model=List[StudentActivityLogOut])
def get_activity_logs(
    student_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical check-in and check-out activity logs.
    - Admin, Warden, Staff: Full logs or filtered by student.
    - Student: Own logs only.
    - Parent: Linked student(s)' logs only.
    """
    query = db.query(StudentActivityLog).join(StudentProfile)

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(StudentActivityLog.student_id == profile.id)
    elif current_user.role == "parent":
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        if not student_ids:
            return []
        query = query.filter(StudentActivityLog.student_id.in_(student_ids))
        if student_id and student_id in student_ids:
            query = query.filter(StudentActivityLog.student_id == student_id)
    elif current_user.role in ("admin", "warden", "staff", "accounts_staff"):
        if student_id:
            query = query.filter(StudentActivityLog.student_id == student_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if activity_type in ("check_in", "check_out"):
        query = query.filter(StudentActivityLog.activity_type == activity_type)

    logs = query.order_by(desc(StudentActivityLog.timestamp), desc(StudentActivityLog.id)).limit(limit).all()

    results = []
    for l in logs:
        room_no = _get_active_room_str(db, l.student_id)
        results.append(_build_log_out(l, l.student, room_no))
    return results


@router.post("/log", response_model=StudentActivityLogOut, status_code=status.HTTP_201_CREATED)
def record_student_activity(
    data: StudentActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a check-in or check-out event with timestamp, location, and optional remarks.
    - Staff, Warden, Admin: Can record for any student.
    - Student: Can record for themselves only.
    - Parent: Forbidden (read-only observer).
    """
    student = db.query(StudentProfile).filter(StudentProfile.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")

    if current_user.role == "student":
        if student.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only log their own check-in/out.")
    elif current_user.role in ("staff", "accounts_staff", "warden", "admin"):
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Only authorized staff and students can record gate activity.")

    event_time = data.timestamp if data.timestamp else datetime.utcnow()
    loc = data.location.strip() if data.location and data.location.strip() else "Main Gate"

    log_entry = StudentActivityLog(
        student_id=student.id,
        activity_type=data.activity_type,
        timestamp=event_time,
        location=loc,
        recorded_by=current_user.id,
        remarks=data.remarks.strip() if data.remarks else None
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    room_no = _get_active_room_str(db, student.id)
    return _build_log_out(log_entry, student, room_no)


# ========================================================
# Parent - Student Link Management Endpoints
# ========================================================

@router.get("/parent-links", response_model=List[ParentStudentLinkOut])
def list_parent_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    """
    Admin and Warden can view all linked parent-student relationships.
    """
    links = db.query(ParentStudentLink).all()
    results = []
    for l in links:
        p_user = db.query(User).filter(User.id == l.parent_user_id).first()
        s_prof = db.query(StudentProfile).filter(StudentProfile.id == l.student_id).first()
        results.append(ParentStudentLinkOut(
            id=l.id,
            parent_user_id=l.parent_user_id,
            parent_email=p_user.email if p_user else None,
            parent_name=p_user.email if p_user else None,
            student_id=l.student_id,
            student_name=s_prof.full_name if s_prof else None,
            student_registration_no=s_prof.registration_no if s_prof else None,
            relationship=l.relationship_type,
            created_at=l.created_at
        ))
    return results


@router.post("/parent-links", response_model=ParentStudentLinkOut, status_code=status.HTTP_201_CREATED)
def create_parent_link(
    data: ParentStudentLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    """
    Link a parent account with a student profile.
    """
    parent = db.query(User).filter(User.id == data.parent_user_id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent user not found.")
    if parent.role != "parent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user must have the 'parent' role.")

    student = db.query(StudentProfile).filter(StudentProfile.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")

    existing = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_user_id == data.parent_user_id,
        ParentStudentLink.student_id == data.student_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This parent is already linked to this student.")

    link = ParentStudentLink(
        parent_user_id=data.parent_user_id,
        student_id=data.student_id,
        relationship_type=data.relationship or "Parent"
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return ParentStudentLinkOut(
        id=link.id,
        parent_user_id=link.parent_user_id,
        parent_email=parent.email,
        parent_name=parent.email,
        student_id=link.student_id,
        student_name=student.full_name,
        student_registration_no=student.registration_no,
        relationship=link.relationship_type,
        created_at=link.created_at
    )


@router.delete("/parent-links/{link_id}", status_code=status.HTTP_200_OK)
def delete_parent_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    link = db.query(ParentStudentLink).filter(ParentStudentLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.")
    db.delete(link)
    db.commit()
    return {"message": "Parent-student link deleted successfully."}
