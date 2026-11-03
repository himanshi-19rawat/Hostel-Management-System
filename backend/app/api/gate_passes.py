from typing import List, Optional
from datetime import datetime, date, time as pytime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import GatePass, StudentProfile, RoomAllocation, User, ParentStudentLink, StudentActivityLog
from app.schemas.schemas import GatePassCreate, GatePassReview, GatePassOut

router = APIRouter(prefix="/gate-passes", tags=["Gate Passes & Security"])

def parse_time(val) -> pytime:
    if isinstance(val, pytime):
        return val
    if isinstance(val, str):
        val = val.strip()
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(val, fmt).time()
            except ValueError:
                pass
    return pytime(12, 0, 0)

def build_gate_pass_out(gp: GatePass, db: Session) -> GatePassOut:
    student = gp.student
    student_name = student.full_name if student else None
    student_roll = student.registration_no if student else None
    
    # Current room
    alloc = db.query(RoomAllocation).filter(
        RoomAllocation.student_id == gp.student_id,
        RoomAllocation.status == "active"
    ).first()
    room_number = alloc.room.room_number if alloc and alloc.room else None
    hostel_block = alloc.room.block if alloc and alloc.room else None

    # Approver name
    approver = db.query(User).filter(User.id == gp.approved_by).first() if gp.approved_by else None
    approver_name = approver.email if approver else None

    # Security verifier
    security = db.query(User).filter(User.id == gp.verified_by_security).first() if gp.verified_by_security else None
    security_name = security.email if security else None

    # Check if currently overdue
    current_status = gp.status
    if current_status == "approved" and gp.actual_exit_time and not gp.actual_return_time:
        expected_dt = datetime.combine(gp.expected_return_date, gp.expected_return_time)
        if datetime.utcnow() > expected_dt:
            current_status = "overdue"

    return GatePassOut(
        id=gp.id,
        pass_number=gp.pass_number,
        student_id=gp.student_id,
        student_name=student_name,
        student_roll=student_roll,
        room_number=room_number,
        hostel_block=hostel_block,
        reason=gp.reason,
        destination=gp.destination,
        departure_date=gp.departure_date,
        departure_time=gp.departure_time.strftime("%H:%M:%S") if isinstance(gp.departure_time, pytime) else str(gp.departure_time),
        expected_return_date=gp.expected_return_date,
        expected_return_time=gp.expected_return_time.strftime("%H:%M:%S") if isinstance(gp.expected_return_time, pytime) else str(gp.expected_return_time),
        emergency_contact=gp.emergency_contact,
        status=current_status,
        approved_by=gp.approved_by,
        approver_name=approver_name,
        approved_at=gp.approved_at,
        rejection_reason=gp.rejection_reason,
        actual_exit_time=gp.actual_exit_time,
        actual_return_time=gp.actual_return_time,
        verified_by_security=gp.verified_by_security,
        security_name=security_name,
        is_late=gp.is_late or (current_status == "overdue"),
        qr_data=gp.qr_data,
        created_at=gp.created_at,
        updated_at=gp.updated_at
    )

@router.get("", response_model=List[GatePassOut])
@router.get("/", response_model=List[GatePassOut], include_in_schema=False)
def list_gate_passes(
    status_filter: Optional[str] = None,
    student_id: Optional[int] = None,
    overdue_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(GatePass)

    if current_user.role == "student":
        student_prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_prof:
            return []
        query = query.filter(GatePass.student_id == student_prof.id)
    elif current_user.role == "parent":
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        if not student_ids:
            return []
        query = query.filter(GatePass.student_id.in_(student_ids))
    else:
        # Admin, Warden, Staff, Security
        if student_id:
            query = query.filter(GatePass.student_id == student_id)

    if status_filter and status_filter != "all":
        query = query.filter(GatePass.status == status_filter)

    gate_passes = query.order_by(GatePass.created_at.desc()).all()
    results = [build_gate_pass_out(gp, db) for gp in gate_passes]

    if overdue_only:
        results = [r for r in results if r.status == "overdue" or r.is_late]

    return results

@router.post("", response_model=GatePassOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=GatePassOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_gate_pass(
    data: GatePassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_student_id = data.student_id

    if current_user.role == "student":
        student_prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_prof:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
        target_student_id = student_prof.id
    elif current_user.role in ("admin", "warden"):
        if not target_student_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="student_id is required.")
        student_prof = db.query(StudentProfile).filter(StudentProfile.id == target_student_id).first()
        if not student_prof:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students and wardens can request gate passes.")

    dep_time = parse_time(data.departure_time)
    ret_time = parse_time(data.expected_return_time)

    try:
        gp = GatePass(
            student_id=target_student_id,
            reason=data.reason.strip(),
            destination=data.destination.strip(),
            departure_date=data.departure_date,
            departure_time=dep_time,
            expected_return_date=data.expected_return_date,
            expected_return_time=ret_time,
            emergency_contact=data.emergency_contact.strip() if data.emergency_contact else student_prof.emergency_contact,
            status="pending"
        )
        db.add(gp)
        db.commit()
        db.refresh(gp)

        # Generate unique preliminary pass_number
        gp.pass_number = f"GP-{datetime.utcnow().strftime('%Y%m%d')}-{gp.id:04d}"
        gp.qr_data = f"GP:{gp.pass_number}|STUDENT:{student_prof.registration_no or student_prof.id}|DEP:{gp.departure_date}"
        db.commit()
        db.refresh(gp)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error creating gate pass: {str(e)}")

    return build_gate_pass_out(gp, db)

@router.put("/{pass_id}/review", response_model=GatePassOut)
def review_gate_pass(
    pass_id: int,
    data: GatePassReview,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    gp = db.query(GatePass).filter(GatePass.id == pass_id).first()
    if not gp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gate pass not found.")

    if gp.status not in ("pending", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot review pass with status '{gp.status}'.")

    student = gp.student
    gp.status = data.status
    gp.approved_by = manager.id
    gp.approved_at = datetime.utcnow()

    if data.status == "approved":
        gp.rejection_reason = None
        if not gp.pass_number:
            gp.pass_number = f"GP-{datetime.utcnow().strftime('%Y%m%d')}-{gp.id:04d}"
        gp.qr_data = f"GP:{gp.pass_number}|STUDENT:{student.registration_no or student.id}|DEST:{gp.destination}"
        if student:
            student.current_status = "gate_pass_issued"
    else:
        gp.rejection_reason = data.rejection_reason or "Disapproved by warden"

    db.commit()
    db.refresh(gp)
    return build_gate_pass_out(gp, db)

@router.post("/{pass_id}/record-exit", response_model=GatePassOut)
def record_gate_exit(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "warden", "staff"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Security or Warden credentials required.")

    gp = db.query(GatePass).filter(GatePass.id == pass_id).first()
    if not gp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gate pass not found.")

    if gp.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Pass must be 'approved' to record departure. Current status: '{gp.status}'.")

    if gp.actual_exit_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Student departure already recorded at {gp.actual_exit_time}.")

    now = datetime.utcnow()
    gp.actual_exit_time = now
    gp.verified_by_security = current_user.id

    student = gp.student
    if student:
        student.current_status = "outside_hostel"

    # Log entry into student_activity_logs for audit
    activity_log = StudentActivityLog(
        student_id=gp.student_id,
        activity_type="check_out",
        timestamp=now,
        location="Main Campus Gate",
        recorded_by=current_user.id,
        remarks=f"Gate Pass departure recorded: {gp.pass_number} -> {gp.destination}"
    )
    db.add(activity_log)

    db.commit()
    db.refresh(gp)
    return build_gate_pass_out(gp, db)

@router.post("/{pass_id}/record-entry", response_model=GatePassOut)
def record_gate_entry(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "warden", "staff"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Security or Warden credentials required.")

    gp = db.query(GatePass).filter(GatePass.id == pass_id).first()
    if not gp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gate pass not found.")

    if not gp.actual_exit_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot record return before student has departed.")

    if gp.actual_return_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Student entry already recorded at {gp.actual_return_time}.")

    now = datetime.utcnow()
    gp.actual_return_time = now
    gp.status = "completed"
    gp.verified_by_security = current_user.id

    # Check if late
    expected_dt = datetime.combine(gp.expected_return_date, gp.expected_return_time)
    if now > expected_dt:
        gp.is_late = True

    student = gp.student
    if student:
        student.current_status = "present_in_hostel"

    # Log entry into student_activity_logs
    activity_log = StudentActivityLog(
        student_id=gp.student_id,
        activity_type="check_in",
        timestamp=now,
        location="Main Campus Gate",
        recorded_by=current_user.id,
        remarks=f"Gate Pass return recorded: {gp.pass_number}{' [LATE RETURN]' if gp.is_late else ''}"
    )
    db.add(activity_log)

    db.commit()
    db.refresh(gp)
    return build_gate_pass_out(gp, db)

@router.get("/verify/{pass_number}", response_model=GatePassOut)
def verify_gate_pass_code(
    pass_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_no = pass_number.strip()
    gp = db.query(GatePass).filter(GatePass.pass_number == clean_no).first()
    if not gp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No gate pass found matching '{clean_no}'.")

    return build_gate_pass_out(gp, db)
