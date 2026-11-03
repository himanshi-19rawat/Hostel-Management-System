from datetime import date as dt_date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_warden
from app.models.models import StudentAttendance, StudentProfile, User
from app.schemas.schemas import (
    AttendanceOut, AttendanceMarkRequest, AttendanceUpdate, AttendanceStudentSummary
)

router = APIRouter(prefix="/attendance", tags=["Student Attendance"])

@router.get("", response_model=List[AttendanceOut])
@router.get("/", response_model=List[AttendanceOut], include_in_schema=False)
def get_attendance(
    date: Optional[dt_date] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudentAttendance).join(StudentProfile)

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(StudentAttendance.student_id == profile.id)
        if date:
            query = query.filter(StudentAttendance.date == date)
    elif current_user.role in ("warden", "admin"):
        # Warden manages, Admin has read-only oversight
        if student_id:
            query = query.filter(StudentAttendance.student_id == student_id)
        if date:
            query = query.filter(StudentAttendance.date == date)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only warden, administrator, and students can view attendance records."
        )

    records = query.order_by(StudentAttendance.date.desc(), StudentProfile.full_name.asc()).all()
    results = []
    for r in records:
        marker_name = r.marker.email if r.marker else None
        results.append(AttendanceOut(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.full_name if r.student else None,
            date=r.date,
            status=r.status,
            remarks=r.remarks,
            marked_by=r.marked_by,
            marked_by_name=marker_name,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results

@router.get("/summary", response_model=AttendanceStudentSummary)
def get_attendance_summary(
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_student_id = student_id
    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return AttendanceStudentSummary(total_days=0, present_count=0, absent_count=0, attendance_percentage=0.0)
        target_student_id = profile.id
    elif current_user.role in ("warden", "admin"):
        if not target_student_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="student_id query parameter is required for staff.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    total_days = db.query(func.count(StudentAttendance.id)).filter(StudentAttendance.student_id == target_student_id).scalar() or 0
    present_count = db.query(func.count(StudentAttendance.id)).filter(
        StudentAttendance.student_id == target_student_id,
        StudentAttendance.status == "present"
    ).scalar() or 0
    absent_count = total_days - present_count
    pct = (float(present_count) / float(total_days) * 100.0) if total_days > 0 else 0.0

    return AttendanceStudentSummary(
        total_days=total_days,
        present_count=present_count,
        absent_count=absent_count,
        attendance_percentage=round(pct, 1)
    )

@router.post("/mark", status_code=status.HTTP_200_OK)
@router.post("/mark/", status_code=status.HTTP_200_OK, include_in_schema=False)
def mark_attendance(
    payload: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Mark student attendance for a given date.
    Prevents duplicate entries by updating existing records (authorized correction),
    or creating new records if none exist for (student_id, date).
    """
    saved_count = 0
    try:
        for item in payload.records:
            student = db.query(StudentProfile).filter(StudentProfile.id == item.student_id).first()
            if not student:
                continue

            existing = db.query(StudentAttendance).filter(
                StudentAttendance.student_id == item.student_id,
                StudentAttendance.date == payload.date
            ).first()

            if existing:
                # Authorized correction
                existing.status = item.status
                existing.remarks = item.remarks
                existing.marked_by = warden.id
                existing.updated_at = datetime.utcnow()
            else:
                # New entry
                record = StudentAttendance(
                    student_id=item.student_id,
                    date=payload.date,
                    status=item.status,
                    remarks=item.remarks,
                    marked_by=warden.id
                )
                db.add(record)
            saved_count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error saving attendance: {str(e)}")

    return {"message": f"Successfully saved attendance for {payload.date} ({saved_count} students processed)."}

@router.put("/{record_id}", response_model=AttendanceOut)
@router.put("/{record_id}/", response_model=AttendanceOut, include_in_schema=False)
def correct_attendance_record(
    record_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Allow an authorized correction by the Warden if attendance was marked incorrectly.
    """
    record = db.query(StudentAttendance).filter(StudentAttendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    record.status = payload.status
    if payload.remarks is not None:
        record.remarks = payload.remarks
    record.marked_by = warden.id
    record.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(record)

    marker_name = record.marker.email if record.marker else None
    return AttendanceOut(
        id=record.id,
        student_id=record.student_id,
        student_name=record.student.full_name if record.student else None,
        date=record.date,
        status=record.status,
        remarks=record.remarks,
        marked_by=record.marked_by,
        marked_by_name=marker_name,
        created_at=record.created_at,
        updated_at=record.updated_at
    )
