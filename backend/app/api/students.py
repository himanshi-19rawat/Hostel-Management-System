from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin_or_warden, require_management
from app.core.security import get_password_hash
from app.models.models import User, StudentProfile, RoomAllocation, Room
from app.schemas.schemas import (
    StudentProfileOut, StudentProfileCreate, StudentProfileUpdate, StudentContactUpdate
)

router = APIRouter(prefix="/students", tags=["Student Profiles"])

@router.get("", response_model=List[StudentProfileOut])
@router.get("/", response_model=List[StudentProfileOut], include_in_schema=False)
def list_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Students CANNOT see list of other students
    if current_user.role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students may only view their own individual profile."
        )
    
    query = db.query(StudentProfile).join(User)
    if search:
        query = query.filter(
            (StudentProfile.full_name.ilike(f"%{search}%")) |
            (StudentProfile.registration_no.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    if department:
        query = query.filter(StudentProfile.department == department)
        
    students = query.order_by(StudentProfile.id.asc()).all()
    results = []
    for s in students:
        # fetch current active room
        alloc = db.query(RoomAllocation).join(Room).filter(
            RoomAllocation.student_id == s.id,
            RoomAllocation.status == "active"
        ).first()
        room_str = f"{alloc.room.block} - Room {alloc.room.room_number}" if alloc and alloc.room else None

        results.append(StudentProfileOut(
            id=s.id,
            user_id=s.user_id,
            email=s.user.email if s.user else None,
            is_active=s.user.is_active if s.user else True,
            full_name=s.full_name,
            registration_no=s.registration_no,
            phone=s.phone,
            emergency_contact=s.emergency_contact,
            department=s.department,
            year_of_study=s.year_of_study,
            address=s.address,
            created_at=s.created_at,
            updated_at=s.updated_at,
            current_room=room_str
        ))
    return results

@router.get("/me", response_model=StudentProfileOut)
def get_my_student_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user is not a student.")
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
    
    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_str = f"{alloc.room.block} - Room {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        email=current_user.email,
        is_active=current_user.is_active,
        full_name=profile.full_name,
        registration_no=profile.registration_no,
        phone=profile.phone,
        emergency_contact=profile.emergency_contact,
        department=profile.department,
        year_of_study=profile.year_of_study,
        address=profile.address,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        current_room=room_str
    )

@router.put("/me/contact", response_model=StudentProfileOut)
def update_my_contact(
    data: StudentContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can update self-contact.")
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
    
    if data.phone is not None:
        profile.phone = data.phone
    if data.emergency_contact is not None:
        profile.emergency_contact = data.emergency_contact
    if data.address is not None:
        profile.address = data.address

    db.commit()
    db.refresh(profile)

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_str = f"{alloc.room.block} - Room {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        email=current_user.email,
        is_active=current_user.is_active,
        full_name=profile.full_name,
        registration_no=profile.registration_no,
        phone=profile.phone,
        emergency_contact=profile.emergency_contact,
        department=profile.department,
        year_of_study=profile.year_of_study,
        address=profile.address,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        current_room=room_str
    )

@router.get("/{student_id}", response_model=StudentProfileOut)
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce access: Student can only view their own profile!
    if current_user.role == "student":
        own_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not own_profile or own_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot view other student's records.")
    
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found.")

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_str = f"{alloc.room.block} - Room {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        email=profile.user.email if profile.user else None,
        is_active=profile.user.is_active if profile.user else True,
        full_name=profile.full_name,
        registration_no=profile.registration_no,
        phone=profile.phone,
        emergency_contact=profile.emergency_contact,
        department=profile.department,
        year_of_study=profile.year_of_study,
        address=profile.address,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        current_room=room_str
    )

@router.put("/{student_id}", response_model=StudentProfileOut)
def update_student(
    student_id: int,
    data: StudentProfileUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)

    alloc = db.query(RoomAllocation).join(Room).filter(
        RoomAllocation.student_id == profile.id,
        RoomAllocation.status == "active"
    ).first()
    room_str = f"{alloc.room.block} - Room {alloc.room.room_number}" if alloc and alloc.room else None

    return StudentProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        email=profile.user.email if profile.user else None,
        is_active=profile.user.is_active if profile.user else True,
        full_name=profile.full_name,
        registration_no=profile.registration_no,
        phone=profile.phone,
        emergency_contact=profile.emergency_contact,
        department=profile.department,
        year_of_study=profile.year_of_study,
        address=profile.address,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        current_room=room_str
    )
