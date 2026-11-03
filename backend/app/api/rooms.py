from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import Room, RoomAllocation, StudentProfile, User
from app.schemas.schemas import (
    RoomOut, RoomCreate, RoomUpdate,
    RoomAllocationOut, RoomAllocationCreate, RoomAllocationUpdate
)

router = APIRouter(prefix="/rooms", tags=["Rooms & Allocations"])

# --- Room Endpoints ---

@router.get("", response_model=List[RoomOut])
@router.get("/", response_model=List[RoomOut], include_in_schema=False)
def list_rooms(
    block: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "accounts_staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accounts Staff cannot manage rooms.")
    
    query = db.query(Room)
    if block:
        query = query.filter(Room.block == block)
    if status_filter:
        query = query.filter(Room.status == status_filter)
    
    rooms = query.order_by(Room.block.asc(), Room.room_number.asc()).all()
    results = []
    for r in rooms:
        active_allocs = db.query(func.count(RoomAllocation.id)).filter(
            RoomAllocation.room_id == r.id,
            RoomAllocation.status == "active"
        ).scalar() or 0

        results.append(RoomOut(
            id=r.id,
            room_number=r.room_number,
            block=r.block,
            floor=r.floor,
            capacity=r.capacity,
            room_type=r.room_type,
            monthly_rate=float(r.monthly_rate),
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
            occupied_count=active_allocs
        ))
    return results

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=RoomOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_room(
    data: RoomCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    existing = db.query(Room).filter(Room.room_number == data.room_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room number '{data.room_number}' already exists."
        )
    
    try:
        room = Room(
            room_number=data.room_number.strip(),
            block=data.block.strip(),
            floor=data.floor,
            capacity=data.capacity,
            room_type=data.room_type.strip() if data.room_type else "Standard",
            monthly_rate=data.monthly_rate,
            status=data.status
        )
        db.add(room)
        db.commit()
        db.refresh(room)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error creating room: {str(e)}")

    return RoomOut(
        id=room.id,
        room_number=room.room_number,
        block=room.block,
        floor=room.floor,
        capacity=room.capacity,
        room_type=room.room_type,
        monthly_rate=float(room.monthly_rate),
        status=room.status,
        created_at=room.created_at,
        updated_at=room.updated_at,
        occupied_count=0
    )

@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    data: RoomUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(room, field, val)

    db.commit()
    db.refresh(room)

    active_allocs = db.query(func.count(RoomAllocation.id)).filter(
        RoomAllocation.room_id == room.id,
        RoomAllocation.status == "active"
    ).scalar() or 0

    return RoomOut(
        id=room.id,
        room_number=room.room_number,
        block=room.block,
        floor=room.floor,
        capacity=room.capacity,
        room_type=room.room_type,
        monthly_rate=float(room.monthly_rate),
        status=room.status,
        created_at=room.created_at,
        updated_at=room.updated_at,
        occupied_count=active_allocs
    )

@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    
    active_alloc = db.query(RoomAllocation).filter(
        RoomAllocation.room_id == room_id,
        RoomAllocation.status == "active"
    ).first()
    if active_alloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete room while active student allocations exist."
        )

    db.delete(room)
    db.commit()
    return {"message": f"Room '{room.room_number}' deleted successfully."}


# --- Room Allocation Endpoints ---

@router.get("/allocations/list", response_model=List[RoomAllocationOut])
@router.get("/allocations/list/", response_model=List[RoomAllocationOut], include_in_schema=False)
def list_allocations(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "accounts_staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accounts Staff cannot access room allocations.")
    
    query = db.query(RoomAllocation).join(StudentProfile).join(Room)
    
    if current_user.role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(RoomAllocation.student_id == student_profile.id)
    else:
        if status_filter:
            query = query.filter(RoomAllocation.status == status_filter)

    allocations = query.order_by(RoomAllocation.created_at.desc()).all()
    results = []
    for a in allocations:
        results.append(RoomAllocationOut(
            id=a.id,
            student_id=a.student_id,
            room_id=a.room_id,
            student_name=a.student.full_name if a.student else None,
            room_number=a.room.room_number if a.room else None,
            block=a.room.block if a.room else None,
            allocated_from=a.allocated_from,
            allocated_to=a.allocated_to,
            status=a.status,
            remarks=a.remarks,
            created_at=a.created_at
        ))
    return results

@router.post("/allocations", response_model=RoomAllocationOut, status_code=status.HTTP_201_CREATED)
@router.post("/allocations/", response_model=RoomAllocationOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_allocation(
    data: RoomAllocationCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    student = db.query(StudentProfile).filter(StudentProfile.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student ID #{data.student_id} not found.")

    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Room ID #{data.room_id} not found.")

    # Check if student already has active allocation
    active_student_alloc = db.query(RoomAllocation).filter(
        RoomAllocation.student_id == data.student_id,
        RoomAllocation.status == "active"
    ).first()
    if active_student_alloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student '{student.full_name}' already has an active allocation."
        )

    # Check room capacity
    current_occupancy = db.query(func.count(RoomAllocation.id)).filter(
        RoomAllocation.room_id == data.room_id,
        RoomAllocation.status == "active"
    ).scalar() or 0

    if current_occupancy >= room.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room '{room.room_number}' is at full capacity ({room.capacity}/{room.capacity})."
        )

    try:
        allocation = RoomAllocation(
            student_id=data.student_id,
            room_id=data.room_id,
            allocated_from=data.allocated_from,
            allocated_to=data.allocated_to,
            status="active",
            remarks=data.remarks
        )
        db.add(allocation)
        
        # Update room status if now full
        if current_occupancy + 1 >= room.capacity:
            room.status = "full"
        else:
            room.status = "available"

        db.commit()
        db.refresh(allocation)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error saving allocation: {str(e)}")

    return RoomAllocationOut(
        id=allocation.id,
        student_id=allocation.student_id,
        room_id=allocation.room_id,
        student_name=student.full_name,
        room_number=room.room_number,
        block=room.block,
        allocated_from=allocation.allocated_from,
        allocated_to=allocation.allocated_to,
        status=allocation.status,
        remarks=allocation.remarks,
        created_at=allocation.created_at
    )

@router.put("/allocations/{allocation_id}", response_model=RoomAllocationOut)
def update_allocation(
    allocation_id: int,
    data: RoomAllocationUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    alloc = db.query(RoomAllocation).filter(RoomAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found.")

    if data.allocated_to is not None:
        alloc.allocated_to = data.allocated_to
    if data.status is not None:
        alloc.status = data.status
        # If vacated, adjust room status
        if data.status == "vacated":
            room = alloc.room
            active_count = db.query(func.count(RoomAllocation.id)).filter(
                RoomAllocation.room_id == room.id,
                RoomAllocation.status == "active",
                RoomAllocation.id != alloc.id
            ).scalar() or 0
            if active_count < room.capacity and room.status != "maintenance":
                room.status = "available"
    if data.remarks is not None:
        alloc.remarks = data.remarks

    db.commit()
    db.refresh(alloc)

    return RoomAllocationOut(
        id=alloc.id,
        student_id=alloc.student_id,
        room_id=alloc.room_id,
        student_name=alloc.student.full_name if alloc.student else None,
        room_number=alloc.room.room_number if alloc.room else None,
        block=alloc.room.block if alloc.room else None,
        allocated_from=alloc.allocated_from,
        allocated_to=alloc.allocated_to,
        status=alloc.status,
        remarks=alloc.remarks,
        created_at=alloc.created_at
    )
