from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.permissions import get_current_user
from app.models.models import User, StudentProfile
from app.schemas.schemas import Token, LoginRequest, PasswordChangeRequest, FirstLoginPasswordChange, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your hostel administrator."
        )

    full_name = None
    if user.student_profile:
        full_name = user.student_profile.full_name
    elif user.role == "admin":
        full_name = "Hostel Administrator"
    elif user.role == "warden":
        full_name = "Chief Warden"
    elif user.role in ("staff", "accounts_staff"):
        full_name = "Hostel Staff"
    elif user.role == "parent":
        full_name = "Parent / Guardian"

    access_token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": full_name,
        "user_id": user.id,
        "must_change_password": user.must_change_password
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    full_name = None
    if current_user.student_profile:
        full_name = current_user.student_profile.full_name
    elif current_user.role == "admin":
        full_name = "Hostel Administrator"
    elif current_user.role == "warden":
        full_name = "Chief Warden"
    elif current_user.role in ("staff", "accounts_staff"):
        full_name = "Hostel Staff"
    elif current_user.role == "parent":
        full_name = "Parent / Guardian"

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        created_at=current_user.created_at,
        full_name=full_name
    )

@router.post("/change-password")
def change_password(data: PasswordChangeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect existing password"
        )
    
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password updated successfully."}

@router.post("/first-login-change-password")
def first_login_change_password(data: FirstLoginPasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Initial password change is not required for this account.",
        )
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect temporary initial password"
        )
    
    if data.new_password == data.old_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from initial password"
        )

    current_user.password_hash = get_password_hash(data.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Initial password changed successfully. Welcome to your account!"}
