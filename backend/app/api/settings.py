from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin
from app.models.models import User, UserSettings, HostelSetting
from app.schemas.schemas import (
    UserSettingsOut, UserSettingsUpdate,
    HostelSettingsOut, HostelSettingsUpdate
)

router = APIRouter(prefix="/settings", tags=["Settings & Usability"])

@router.get("/usability", response_model=UserSettingsOut)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id, theme="light", high_contrast=False, font_size="medium", compact_tables=False)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return UserSettingsOut(
        theme=settings.theme,
        high_contrast=settings.high_contrast,
        font_size=settings.font_size,
        compact_tables=settings.compact_tables
    )

@router.put("/usability", response_model=UserSettingsOut)
def update_user_settings(
    data: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, val)

    db.commit()
    db.refresh(settings)

    return UserSettingsOut(
        theme=settings.theme,
        high_contrast=settings.high_contrast,
        font_size=settings.font_size,
        compact_tables=settings.compact_tables
    )

@router.get("/hostel", response_model=HostelSettingsOut)
def get_hostel_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(HostelSetting).first()
    if not setting:
        # Keep the setup state empty until an administrator enters verified
        # hostel information; do not persist invented contact or policy data.
        return HostelSettingsOut(
            hostel_name="",
            contact_email=None,
            contact_phone=None,
            address=None,
            rules_policy=None,
            updated_at=None,
        )

    return HostelSettingsOut(
        hostel_name=setting.hostel_name,
        contact_email=setting.contact_email,
        contact_phone=setting.contact_phone,
        address=setting.address,
        rules_policy=setting.rules_policy,
        updated_at=setting.updated_at
    )

@router.put("/hostel", response_model=HostelSettingsOut)
def update_hostel_settings(
    data: HostelSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    setting = db.query(HostelSetting).first()
    if not setting:
        setting = HostelSetting()
        db.add(setting)

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(setting, field, val)

    setting.updated_by = admin.id
    db.commit()
    db.refresh(setting)

    return HostelSettingsOut(
        hostel_name=setting.hostel_name,
        contact_email=setting.contact_email,
        contact_phone=setting.contact_phone,
        address=setting.address,
        rules_policy=setting.rules_policy,
        updated_at=setting.updated_at
    )
