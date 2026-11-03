from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden
from app.models.models import Room, RoomAllocation, StudentProfile, User
from app.schemas.schemas import (
    RoomOut, RoomCreate, RoomUpdate, BedOut,
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
            hostel_name=r.hostel_name or "Main Campus Hostel",
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

@router.get("/{room_id}/beds", response_model=List[BedOut])
def get_room_beds(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "accounts_staff":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accounts Staff cannot access room beds.")
    
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    active_allocs = db.query(RoomAllocation).join(StudentProfile).filter(
        RoomAllocation.room_id == room_id,
        RoomAllocation.status == "active"
    ).all()

    occupied_map = {a.bed_number: a for a in active_allocs}
    beds = []

    # Standard slots based on capacity (Bed 1, Bed 2, ...)
    for idx in range(1, room.capacity + 1):
        bed_name = f"Bed {idx}"
        if bed_name in occupied_map:
            alloc = occupied_map[bed_name]
            beds.append(BedOut(
                bed_number=bed_name,
                status="occupied",
                student_id=alloc.student_id,
                student_name=alloc.student.full_name if alloc.student else None,
                registration_no=alloc.student.registration_no if alloc.student else None,
                allocation_id=alloc.id,
                allocated_from=alloc.allocated_from
            ))
        else:
            beds.append(BedOut(
                bed_number=bed_name,
                status="available",
                student_id=None,
                student_name=None,
                registration_no=None,
                allocation_id=None,
                allocated_from=None
            ))

    # Also include any active allocations that might have custom bed labels
    for bed_label, alloc in occupied_map.items():
        if not any(b.bed_number == bed_label for b in beds):
            beds.append(BedOut(
                bed_number=bed_label,
                status="occupied",
                student_id=alloc.student_id,
                student_name=alloc.student.full_name if alloc.student else None,
                registration_no=alloc.student.registration_no if alloc.student else None,
                allocation_id=alloc.id,
                allocated_from=alloc.allocated_from
            ))

    return beds

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
            hostel_name=data.hostel_name.strip() if data.hostel_name else "Main Campus Hostel",
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
        hostel_name=room.hostel_name,
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
        hostel_name=room.hostel_name,
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
            bed_number=a.bed_number or "Bed 1",
            student_name=a.student.full_name if a.student else None,
            room_number=a.room.room_number if a.room else None,
            hostel_name=a.room.hostel_name if a.room else "Main Campus Hostel",
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

    # Check existing active allocations for this room
    existing_room_allocs = db.query(RoomAllocation).filter(
        RoomAllocation.room_id == data.room_id,
        RoomAllocation.status == "active"
    ).all()
    current_occupancy = len(existing_room_allocs)

    if current_occupancy >= room.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room '{room.room_number}' is at full capacity ({room.capacity}/{room.capacity})."
        )

    occupied_beds = {a.bed_number for a in existing_room_allocs if a.bed_number}
    
    target_bed = data.bed_number.strip() if data.bed_number and data.bed_number.strip() else None
    if target_bed:
        if target_bed in occupied_beds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed '{target_bed}' is already occupied in Room {room.room_number}."
            )
    else:
        # Automatically determine the first available bed
        for idx in range(1, room.capacity + 1):
            candidate = f"Bed {idx}"
            if candidate not in occupied_beds:
                target_bed = candidate
                break
        if not target_bed:
            target_bed = f"Bed {current_occupancy + 1}"

    try:
        allocation = RoomAllocation(
            student_id=data.student_id,
            room_id=data.room_id,
            bed_number=target_bed,
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
        bed_number=allocation.bed_number,
        student_name=student.full_name,
        room_number=room.room_number,
        hostel_name=room.hostel_name,
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

    if data.bed_number is not None and data.bed_number.strip():
        # verify not colliding with another active bed
        colliding = db.query(RoomAllocation).filter(
            RoomAllocation.room_id == alloc.room_id,
            RoomAllocation.bed_number == data.bed_number.strip(),
            RoomAllocation.status == "active",
            RoomAllocation.id != alloc.id
        ).first()
        if colliding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bed '{data.bed_number}' is already occupied by another student."
            )
        alloc.bed_number = data.bed_number.strip()

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
        bed_number=alloc.bed_number,
        student_name=alloc.student.full_name if alloc.student else None,
        room_number=alloc.room.room_number if alloc.room else None,
        hostel_name=alloc.room.hostel_name if alloc.room else "Main Campus Hostel",
        block=alloc.room.block if alloc.room else None,
        allocated_from=alloc.allocated_from,
        allocated_to=alloc.allocated_to,
        status=alloc.status,
        remarks=alloc.remarks,
        created_at=alloc.created_at
    )

@router.post("/allocations/{allocation_id}/vacate", response_model=RoomAllocationOut)
def vacate_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    alloc = db.query(RoomAllocation).filter(RoomAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found.")

    if alloc.status == "vacated":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Allocation is already vacated.")

    alloc.status = "vacated"
    alloc.allocated_to = date.today()

    room = alloc.room
    if room:
        active_count = db.query(func.count(RoomAllocation.id)).filter(
            RoomAllocation.room_id == room.id,
            RoomAllocation.status == "active",
            RoomAllocation.id != alloc.id
        ).scalar() or 0
        if active_count < room.capacity and room.status != "maintenance":
            room.status = "available"

    db.commit()
    db.refresh(alloc)

    return RoomAllocationOut(
        id=alloc.id,
        student_id=alloc.student_id,
        room_id=alloc.room_id,
        bed_number=alloc.bed_number,
        student_name=alloc.student.full_name if alloc.student else None,
        room_number=alloc.room.room_number if alloc.room else None,
        hostel_name=alloc.room.hostel_name if alloc.room else "Main Campus Hostel",
        block=alloc.room.block if alloc.room else None,
        allocated_from=alloc.allocated_from,
        allocated_to=alloc.allocated_to,
        status=alloc.status,
        remarks=alloc.remarks,
        created_at=alloc.created_at
    )
