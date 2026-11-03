from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import require_admin
from app.core.security import get_password_hash
from app.models.models import User, StudentProfile
from app.schemas.schemas import UserOut, UserAdminCreate, UserAdminUpdate

router = APIRouter(prefix="/users", tags=["User Administration (Admin Only)"])

@router.get("", response_model=List[UserOut])
@router.get("/", response_model=List[UserOut], include_in_schema=False)
def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    
    users = query.order_by(User.id.asc()).all()
    results = []
    for u in users:
        full_name = None
        if u.student_profile:
            full_name = u.student_profile.full_name
        elif u.role == "admin":
            full_name = "Hostel Administrator"
        elif u.role == "warden":
            full_name = "Chief Warden"
        elif u.role in ("staff", "accounts_staff"):
            full_name = "Hostel Staff"
        elif u.role == "parent":
            full_name = "Parent / Guardian"
        
        results.append(UserOut(
            id=u.id,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            full_name=full_name
        ))
    return results

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_user(
    data: UserAdminCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{data.email}' already exists."
        )
    
    try:
        new_user = User(
            email=data.email,
            password_hash=get_password_hash(data.password),
            role=data.role,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        if data.role == "student":
            student_name = data.full_name.strip() if data.full_name else data.email.split("@")[0].capitalize()
            profile = StudentProfile(
                user_id=new_user.id,
                full_name=student_name
            )
            db.add(profile)
            db.commit()
            db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error creating user: {str(e)}")

    return UserOut(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        full_name=data.full_name
    )

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Prevent self-deactivation or revoking admin role on self
    if user.id == admin.id:
        if data.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrator cannot deactivate own account.")
        if data.role and data.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote own administrator role.")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = data.role
    if data.password:
        user.password_hash = get_password_hash(data.password)
        user.must_change_password = True

    db.commit()
    db.refresh(user)

    full_name = user.student_profile.full_name if user.student_profile else None
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        full_name=full_name
    )
