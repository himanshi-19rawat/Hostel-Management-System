from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import Notice, User
from app.schemas.schemas import NoticeOut, NoticeCreate, NoticeUpdate

router = APIRouter(prefix="/notices", tags=["Notices"])

@router.get("", response_model=List[NoticeOut])
@router.get("/", response_model=List[NoticeOut], include_in_schema=False)
def list_notices(
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notice).join(User)

    # Role-based visibility
    if current_user.role == "student":
        query = query.filter(Notice.target_role.in_(["all", "student"]))
    elif current_user.role in ("staff", "accounts_staff"):
        query = query.filter(Notice.target_role.in_(["all", "staff", "accounts_staff"]))
    elif current_user.role == "parent":
        query = query.filter(Notice.target_role.in_(["all", "parent", "parents"]))
    # Admin and Warden can see all notices

    if priority:
        query = query.filter(Notice.priority == priority)
    if search:
        query = query.filter(Notice.title.ilike(f"%{search}%") | Notice.content.ilike(f"%{search}%"))

    notices = query.order_by(Notice.is_pinned.desc(), Notice.published_at.desc()).all()
    results = []
    for n in notices:
        author_name = "Hostel Administration"
        if n.author:
            if n.author.role == "warden":
                author_name = "Hostel Warden"
            elif n.author.role == "admin":
                author_name = "Administrator"
            elif n.author.student_profile:
                author_name = n.author.student_profile.full_name

        results.append(NoticeOut(
            id=n.id,
            author_id=n.author_id,
            author_name=author_name,
            title=n.title,
            content=n.content,
            target_role=n.target_role,
            priority=n.priority,
            published_at=n.published_at,
            expires_at=n.expires_at,
            is_pinned=n.is_pinned
        ))
    return results

@router.post("", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NoticeOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_notice(
    data: NoticeCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    try:
        notice = Notice(
            author_id=manager.id,
            title=data.title.strip(),
            content=data.content.strip(),
            target_role=data.target_role.strip() if data.target_role else "all",
            priority=data.priority,
            published_at=datetime.utcnow(),
            expires_at=data.expires_at,
            is_pinned=data.is_pinned
        )
        db.add(notice)
        db.commit()
        db.refresh(notice)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error publishing notice: {str(e)}")

    author_name = "Hostel Warden" if manager.role == "warden" else "Administrator"
    return NoticeOut(
        id=notice.id,
        author_id=notice.author_id,
        author_name=author_name,
        title=notice.title,
        content=notice.content,
        target_role=notice.target_role,
        priority=notice.priority,
        published_at=notice.published_at,
        expires_at=notice.expires_at,
        is_pinned=notice.is_pinned
    )

@router.put("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: int,
    data: NoticeUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(notice, field, val)

    db.commit()
    db.refresh(notice)

    author_name = "Hostel Warden" if notice.author and notice.author.role == "warden" else "Administrator"
    return NoticeOut(
        id=notice.id,
        author_id=notice.author_id,
        author_name=author_name,
        title=notice.title,
        content=notice.content,
        target_role=notice.target_role,
        priority=notice.priority,
        published_at=notice.published_at,
        expires_at=notice.expires_at,
        is_pinned=notice.is_pinned
    )

@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted successfully."}
