from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_warden, require_student
from app.models.models import StudentRequest, StudentProfile, RoomAllocation, Room, User, ParentStudentLink
from app.schemas.schemas import (
    StudentRequestCreate, StudentRequestStatusUpdate, StudentRequestOut
)

router = APIRouter(prefix="/leave-outpass", tags=["Leave & Outpass Requests"])

@router.get("", response_model=List[StudentRequestOut])
@router.get("/", response_model=List[StudentRequestOut], include_in_schema=False)
def list_requests(
    request_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudentRequest).join(StudentProfile)

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(StudentRequest.student_id == profile.id)
    elif current_user.role == "parent":
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        if not student_ids:
            return []
        query = query.filter(StudentRequest.student_id.in_(student_ids))
        if student_id and student_id in student_ids:
            query = query.filter(StudentRequest.student_id == student_id)
    elif current_user.role in ("warden", "admin"):
        # Warden manages, Admin has read-only oversight
        if student_id:
            query = query.filter(StudentRequest.student_id == student_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only students, wardens, and administrators have access to leave and outpass records."
        )

    if request_type:
        query = query.filter(StudentRequest.request_type == request_type)
    if status_filter:
        query = query.filter(StudentRequest.status == status_filter)

    requests = query.order_by(StudentRequest.created_at.desc()).all()
    results = []
    for r in requests:
        # Get room info if active allocation exists
        alloc = db.query(RoomAllocation).join(Room).filter(
            RoomAllocation.student_id == r.student_id,
            RoomAllocation.status == "active"
        ).first()
        room_info = f"{alloc.room.block} - {alloc.room.room_number}" if alloc and alloc.room else None

        results.append(StudentRequestOut(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.full_name if r.student else None,
            room_number=room_info,
            request_type=r.request_type,
            start_date=r.start_date,
            end_date=r.end_date,
            start_time=r.start_time,
            end_time=r.end_time,
            reason=r.reason,
            status=r.status,
            decision_remarks=r.decision_remarks,
            action_by=r.action_by,
            action_at=r.action_at,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results

@router.get("/stats")
def get_request_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudentRequest)
    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return {"pending": 0, "approved": 0, "rejected": 0, "total": 0}
        query = query.filter(StudentRequest.student_id == profile.id)
    elif current_user.role == "parent":
        links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_user_id == current_user.id).all()
        student_ids = [l.student_id for l in links]
        if not student_ids:
            return {"pending": 0, "approved": 0, "rejected": 0, "total": 0}
        query = query.filter(StudentRequest.student_id.in_(student_ids))
    elif current_user.role not in ("warden", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    pending = query.filter(StudentRequest.status == "pending").count()
    approved = query.filter(StudentRequest.status == "approved").count()
    rejected = query.filter(StudentRequest.status == "rejected").count()

    return {
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total": pending + approved + rejected
    }

@router.post("", response_model=StudentRequestOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=StudentRequestOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_request(
    data: StudentRequestCreate,
    db: Session = Depends(get_db),
    student_user: User = Depends(require_student)
):
    """
    Students can submit separate Leave or Outpass requests.
    All newly submitted requests start with 'pending' status.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")

    if data.end_date < data.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be earlier than start date.")

    try:
        req = StudentRequest(
            student_id=profile.id,
            request_type=data.request_type,
            start_date=data.start_date,
            end_date=data.end_date,
            start_time=data.start_time,
            end_time=data.end_time,
            reason=data.reason.strip(),
            status="pending"
        )
        db.add(req)
        db.commit()
        db.refresh(req)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error saving request: {str(e)}")

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_info = f"{alloc.room.block} - {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentRequestOut(
        id=req.id,
        student_id=req.student_id,
        student_name=profile.full_name,
        room_number=room_info,
        request_type=req.request_type,
        start_date=req.start_date,
        end_date=req.end_date,
        start_time=req.start_time,
        end_time=req.end_time,
        reason=req.reason,
        status=req.status,
        decision_remarks=req.decision_remarks,
        action_by=req.action_by,
        action_at=req.action_at,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

@router.put("/{request_id}/status", response_model=StudentRequestOut)
def update_request_status(
    request_id: int,
    data: StudentRequestStatusUpdate,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Warden reviews requests and approves or rejects them with decision remarks.
    """
    req = db.query(StudentRequest).filter(StudentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    req.status = data.status
    req.decision_remarks = data.decision_remarks
    req.action_by = warden.id
    req.action_at = datetime.utcnow()

    db.commit()
    db.refresh(req)

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == req.student_id,
        RoomAllocation.status == "active"
    ).first()
    room_info = f"{alloc.room.block} - {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentRequestOut(
        id=req.id,
        student_id=req.student_id,
        student_name=req.student.full_name if req.student else None,
        room_number=room_info,
        request_type=req.request_type,
        start_date=req.start_date,
        end_date=req.end_date,
        start_time=req.start_time,
        end_time=req.end_time,
        reason=req.reason,
        status=req.status,
        decision_remarks=req.decision_remarks,
        action_by=req.action_by,
        action_at=req.action_at,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

@router.delete("/{request_id}")
def cancel_or_delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(StudentRequest).filter(StudentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile or req.student_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel another student's request.")
        if req.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be cancelled.")
    elif current_user.role not in ("warden", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    db.delete(req)
    db.commit()
    return {"message": "Request cancelled/deleted successfully."}
