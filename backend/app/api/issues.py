from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import IssueRequest, StudentProfile, RoomAllocation, Room, User
from app.schemas.schemas import IssueRequestOut, IssueRequestCreate, IssueStatusUpdate

router = APIRouter(prefix="/issues", tags=["Issue Requests & Complaints"])

@router.get("", response_model=List[IssueRequestOut])
@router.get("/", response_model=List[IssueRequestOut], include_in_schema=False)
def list_issues(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "accounts_staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accounts Staff does not have access to maintenance issues.")

    query = db.query(IssueRequest).join(StudentProfile)

    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(IssueRequest.student_id == profile.id)
    else:
        if status_filter:
            query = query.filter(IssueRequest.status == status_filter)
        if category:
            query = query.filter(IssueRequest.category == category)

    issues = query.order_by(IssueRequest.created_at.desc()).all()
    results = []
    for issue in issues:
        # fetch room number
        alloc = db.query(RoomAllocation).join(Room).filter(
            RoomAllocation.student_id == issue.student_id,
            RoomAllocation.status == "active"
        ).first()
        room_no = f"{alloc.room.block}-{alloc.room.room_number}" if alloc and alloc.room else "Unassigned"

        results.append(IssueRequestOut(
            id=issue.id,
            student_id=issue.student_id,
            student_name=issue.student.full_name if issue.student else None,
            room_number=room_no,
            category=issue.category,
            title=issue.title,
            description=issue.description,
            priority=issue.priority,
            status=issue.status,
            resolution_remarks=issue.resolution_remarks,
            created_at=issue.created_at,
            updated_at=issue.updated_at
        ))
    return results

@router.post("", response_model=IssueRequestOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=IssueRequestOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def submit_issue(
    data: IssueRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can submit issue requests.")

    try:
        issue = IssueRequest(
            student_id=profile.id,
            category=data.category,
            title=data.title.strip(),
            description=data.description.strip(),
            priority=data.priority,
            status="open"
        )
        db.add(issue)
        db.commit()
        db.refresh(issue)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error submitting issue request: {str(e)}")

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_no = f"{alloc.room.block}-{alloc.room.room_number}" if alloc and alloc.room else "Unassigned"

    return IssueRequestOut(
        id=issue.id,
        student_id=issue.student_id,
        student_name=profile.full_name,
        room_number=room_no,
        category=issue.category,
        title=issue.title,
        description=issue.description,
        priority=issue.priority,
        status=issue.status,
        resolution_remarks=issue.resolution_remarks,
        created_at=issue.created_at,
        updated_at=issue.updated_at
    )

@router.put("/{issue_id}/status", response_model=IssueRequestOut)
def update_issue_status(
    issue_id: int,
    data: IssueStatusUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    issue = db.query(IssueRequest).filter(IssueRequest.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue request not found.")

    issue.status = data.status
    if data.resolution_remarks is not None:
        issue.resolution_remarks = data.resolution_remarks

    db.commit()
    db.refresh(issue)

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == issue.student_id,
        RoomAllocation.status == "active"
    ).first()
    room_no = f"{alloc.room.block}-{alloc.room.room_number}" if alloc and alloc.room else "Unassigned"

    return IssueRequestOut(
        id=issue.id,
        student_id=issue.student_id,
        student_name=issue.student.full_name if issue.student else None,
        room_number=room_no,
        category=issue.category,
        title=issue.title,
        description=issue.description,
        priority=issue.priority,
        status=issue.status,
        resolution_remarks=issue.resolution_remarks,
        created_at=issue.created_at,
        updated_at=issue.updated_at
    )
