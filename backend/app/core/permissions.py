from typing import List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_access_token
from app.models.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by administrator."
        )

    # The first-login dialog is only a user-interface guard. Enforce the same
    # restriction here so a client cannot call application APIs directly with
    # the temporary-password token.
    if user.must_change_password:
        allowed_suffixes = (
            "/auth/me",
            "/auth/first-login-change-password",
        )
        if not request.url.path.endswith(allowed_suffixes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Change your initial password before using the application.",
            )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This action requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Convenience role dependencies
require_admin = require_roles(["admin"])
require_warden = require_roles(["warden"])
require_staff = require_roles(["staff", "accounts_staff"])
require_student = require_roles(["student"])
require_parent = require_roles(["parent"])

# Composite roles
require_admin_or_warden = require_roles(["admin", "warden"])
require_staff_or_admin = require_roles(["admin", "staff", "accounts_staff"])
require_management = require_roles(["admin", "warden", "staff", "accounts_staff"])
require_gate_controllers = require_roles(["admin", "warden", "staff", "accounts_staff"])
require_activity_viewers = require_roles(["admin", "warden", "staff", "accounts_staff", "parent", "student"])
