import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal, engine, Base
from app.models.models import (
    User, StudentProfile, UserSettings, Room, RoomAllocation, FeeRecord,
    Notice, CalendarEvent, IssueRequest, HostelSetting,
    StudentAttendance, StudentRequest, MessInventory
)
from app.core.security import get_password_hash

def init_database():
    print("Checking and creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Accounts to create
        accounts = [
            {
                "email": "admin@gmail.com",
                "role": "admin",
                "password": "12345",
                "full_name": "Hostel Administrator"
            },
            {
                "email": "anjali@gmail.com",
                "role": "student",
                "password": "12345",
                "full_name": "Anjali"
            },
            {
                "email": "himanshi@gmail.com",
                "role": "student",
                "password": "12345",
                "full_name": "Himanshi"
            },
            {
                "email": "warden@gmail.com",
                "role": "warden",
                "password": "12345",
                "full_name": "Chief Warden"
            },
            {
                "email": "staff@gmail.com",
                "role": "accounts_staff",
                "password": "12345",
                "full_name": "Accounts Staff"
            }
        ]

        print("Verifying initial accounts...")
        for acc in accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                user = User(
                    email=acc["email"],
                    password_hash=get_password_hash(acc["password"]),
                    role=acc["role"],
                    is_active=True,
                    must_change_password=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                # If student, create initial profile entry with full name
                if acc["role"] == "student":
                    profile = StudentProfile(
                        user_id=user.id,
                        full_name=acc["full_name"]
                    )
                    db.add(profile)

                # Initialize default user settings
                settings = UserSettings(
                    user_id=user.id,
                    theme="light",
                    high_contrast=False,
                    font_size="medium",
                    compact_tables=False
                )
                db.add(settings)
                db.commit()
                print(f"Created account: {acc['email']} ({acc['role']})")
            else:
                print(f"Account exists: {acc['email']} ({existing.role})")

        print("Database initialization complete. Only the five authorized accounts, their required student profiles, and user preferences were initialized.")
    except Exception as e:
        print(f"Error during database initialization: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
