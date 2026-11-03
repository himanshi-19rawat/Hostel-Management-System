from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import CalendarEvent, User
from app.schemas.schemas import CalendarEventOut, CalendarEventCreate, CalendarEventUpdate

router = APIRouter(prefix="/calendar", tags=["Calendar & Reminders"])

@router.get("", response_model=List[CalendarEventOut])
@router.get("/", response_model=List[CalendarEventOut], include_in_schema=False)
def list_events(
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CalendarEvent).join(User)

    if current_user.role == "student":
        query = query.filter(CalendarEvent.target_role.in_(["all", "student"]))
    elif current_user.role in ("staff", "accounts_staff"):
        query = query.filter(CalendarEvent.target_role.in_(["all", "staff", "accounts_staff"]))
    elif current_user.role == "parent":
        query = query.filter(CalendarEvent.target_role.in_(["all", "parent", "parents"]))

    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)

    events = query.order_by(CalendarEvent.start_date.asc()).all()
    results = []
    for e in events:
        creator_name = "Hostel Admin"
        if e.creator:
            if e.creator.role == "warden":
                creator_name = "Hostel Warden"
            elif e.creator.role == "admin":
                creator_name = "Administrator"

        results.append(CalendarEventOut(
            id=e.id,
            created_by=e.created_by,
            creator_name=creator_name,
            title=e.title,
            description=e.description,
            event_type=e.event_type,
            start_date=e.start_date,
            end_date=e.end_date,
            target_role=e.target_role,
            created_at=e.created_at
        ))
    return results

@router.post("", response_model=CalendarEventOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CalendarEventOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_event(
    data: CalendarEventCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    try:
        event = CalendarEvent(
            created_by=manager.id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            event_type=data.event_type,
            start_date=data.start_date,
            end_date=data.end_date,
            target_role=data.target_role.strip() if data.target_role else "all"
        )
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error scheduling event: {str(e)}")

    creator_name = "Hostel Warden" if manager.role == "warden" else "Administrator"
    return CalendarEventOut(
        id=event.id,
        created_by=event.created_by,
        creator_name=creator_name,
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        start_date=event.start_date,
        end_date=event.end_date,
        target_role=event.target_role,
        created_at=event.created_at
    )

@router.put("/{event_id}", response_model=CalendarEventOut)
def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(event, field, val)

    db.commit()
    db.refresh(event)

    creator_name = "Hostel Warden" if event.creator and event.creator.role == "warden" else "Administrator"
    return CalendarEventOut(
        id=event.id,
        created_by=event.created_by,
        creator_name=creator_name,
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        start_date=event.start_date,
        end_date=event.end_date,
        target_role=event.target_role,
        created_at=event.created_at
    )

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully."}
