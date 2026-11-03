import os
import sys
from datetime import date, datetime

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "verify_forms.db"))
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except Exception:
        pass

from app.core.config import settings
settings.DATABASE_URL = f"sqlite:///{db_path}"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import session

session.engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
session.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=session.engine)

from fastapi import HTTPException
from app.database.session import Base
from app.models.models import (
    User, StudentProfile, UserSettings, StudentAttendance,
    StudentRequest, MessInventory, FeeRecord, Room, RoomAllocation,
    Notice, CalendarEvent, IssueRequest, HostelSetting
)
from app.core.security import get_password_hash
from app.core.permissions import require_warden, require_admin, require_student, get_current_user

# Route functions
from app.api.inventory import list_inventory, create_inventory_item, update_inventory_item, delete_inventory_item
from app.api.rooms import list_rooms, create_room, update_room, delete_room, list_allocations, create_allocation, update_allocation
from app.api.fees import list_fees, create_fee_record, update_fee_record, record_payment
from app.api.attendance import get_attendance, mark_attendance, correct_attendance_record
from app.api.leave_outpass import list_requests, create_request, update_request_status, cancel_or_delete_request
from app.api.notices import list_notices, create_notice, delete_notice
from app.api.calendar import list_events, create_event, delete_event
from app.api.issues import list_issues, submit_issue, update_issue_status
from app.api.users import list_users, create_user, update_user
from app.api.students import get_my_student_profile, update_my_contact, get_student_detail, update_student
from app.api.settings import get_hostel_settings, update_hostel_settings, get_user_settings, update_user_settings
from app.api.auth import change_password

# Schemas
from app.schemas.schemas import (
    MessInventoryCreate, MessInventoryUpdate,
    RoomCreate, RoomUpdate, RoomAllocationCreate, RoomAllocationUpdate,
    FeeRecordCreate, FeeRecordUpdate, FeePaymentCreate,
    AttendanceMarkRequest, AttendanceRecordItem, AttendanceUpdate,
    StudentRequestCreate, StudentRequestStatusUpdate,
    NoticeCreate, CalendarEventCreate, IssueRequestCreate, IssueStatusUpdate,
    UserAdminCreate, UserAdminUpdate, StudentContactUpdate, StudentProfileBase,
    HostelSettingsUpdate, UserSettingsUpdate, PasswordChangeRequest
)

def run_tests():
    print("=" * 70)
    print("HOSTEL MANAGEMENT SYSTEM - ALL FORMS END-TO-END VERIFICATION")
    print("=" * 70)

    Base.metadata.create_all(bind=session.engine)
    db = session.SessionLocal()

    try:
        # 1. Initialize Users
        admin = User(email="admin@gmail.com", password_hash=get_password_hash("12345"), role="admin", is_active=True, must_change_password=False)
        warden = User(email="warden@gmail.com", password_hash=get_password_hash("12345"), role="warden", is_active=True, must_change_password=False)
        staff = User(email="staff@gmail.com", password_hash=get_password_hash("12345"), role="accounts_staff", is_active=True, must_change_password=False)
        anjali = User(email="anjali@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)
        himanshi = User(email="himanshi@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)

        db.add_all([admin, warden, staff, anjali, himanshi])
        db.commit()

        anjali_p = StudentProfile(user_id=anjali.id, full_name="Anjali Sharma", department="Computer Science", year_of_study=3)
        himanshi_p = StudentProfile(user_id=himanshi.id, full_name="Himanshi Patel", department="Information Technology", year_of_study=2)
        db.add_all([anjali_p, himanshi_p])
        db.commit()

        print("[INIT] Initialized test environment with 5 users and 2 student profiles.")

        # =========================================================================
        # FORM 1: Mess Inventory Form (Warden Sole Manager; Admin Read-Only)
        # =========================================================================
        print("-" * 50)
        print("Testing Form 1: Mess Inventory Form")

        # Create
        rice = create_inventory_item(
            MessInventoryCreate(
                item_name="Basmati Rice",
                category="Grains & Cereals",
                quantity=100.0,
                unit="kg",
                min_threshold=20.0,
                unit_price=75.0,
                notes="Warehouse Rack A"
            ),
            db=db,
            warden=warden
        )
        assert rice.id is not None
        assert rice.quantity == 100.0
        print(f"[PASS] Mess Inventory Add: Item #{rice.id} '{rice.item_name}' saved successfully.")

        # Update
        updated_rice = update_inventory_item(
            rice.id,
            MessInventoryUpdate(quantity=85.5, notes="Drawn 14.5 kg for lunch"),
            db=db,
            warden=warden
        )
        assert updated_rice.quantity == 85.5
        print(f"[PASS] Mess Inventory Edit/Update: Item #{rice.id} quantity updated to 85.5 kg.")

        # Delete
        oil = create_inventory_item(
            MessInventoryCreate(item_name="Temp Oil", category="Cooking Oils & Ghee", quantity=5.0, unit="L"),
            db=db,
            warden=warden
        )
        del_msg = delete_inventory_item(oil.id, db=db, warden=warden)
        assert "deleted successfully" in del_msg["message"]
        print(f"[PASS] Mess Inventory Delete: Item #{oil.id} removed successfully.")

        # =========================================================================
        # FORM 2: Rooms & Allocations Forms
        # =========================================================================
        print("-" * 50)
        print("Testing Form 2: Rooms & Allocations Forms")

        # Add Room
        room = create_room(
            RoomCreate(
                room_number="101-A",
                block="Block-A",
                floor=1,
                capacity=2,
                room_type="Standard Shared",
                monthly_rate=4500.0,
                status="available"
            ),
            db=db,
            manager=warden
        )
        assert room.id is not None
        assert room.room_number == "101-A"
        print(f"[PASS] Add Room Form: Room #{room.id} '{room.room_number}' created.")

        # Allocate Room Form
        alloc = create_allocation(
            RoomAllocationCreate(
                student_id=anjali_p.id,
                room_id=room.id,
                allocated_from=date(2026, 11, 1),
                remarks="First semester allocation"
            ),
            db=db,
            manager=warden
        )
        assert alloc.id is not None
        assert alloc.status == "active"
        print(f"[PASS] Room Allocation Form: Bed in room '{room.room_number}' allocated to student '{anjali_p.full_name}'.")

        # Vacate Room Form
        vacated = update_allocation(
            alloc.id,
            RoomAllocationUpdate(status="vacated", allocated_to=date(2026, 11, 30)),
            db=db,
            manager=warden
        )
        assert vacated.status == "vacated"
        print(f"[PASS] Vacate Room Action: Allocation #{alloc.id} vacated successfully.")

        # Re-allocate for remaining tests
        alloc = create_allocation(
            RoomAllocationCreate(
                student_id=anjali_p.id,
                room_id=room.id,
                allocated_from=date(2026, 11, 1),
                remarks="Re-allocated"
            ),
            db=db,
            manager=warden
        )

        # =========================================================================
        # FORM 3: Fees & Payment Forms (Warden Only)
        # =========================================================================
        print("-" * 50)
        print("Testing Form 3: Fees & Payment Forms")

        # Create Fee Invoice
        fee = create_fee_record(
            FeeRecordCreate(
                student_id=anjali_p.id,
                fee_type="Hostel Room & Mess Fee",
                amount_due=5000.0,
                due_date=date(2026, 11, 15),
                notes="November billing cycle"
            ),
            db=db,
            warden_user=warden
        )
        assert fee.id is not None
        assert fee.status == "pending"
        print(f"[PASS] Create Fee Form: Invoice #{fee.id} for ₹{fee.amount_due} generated.")

        # Record Payment
        paid_fee = record_payment(
            fee.id,
            FeePaymentCreate(
                amount_paying=5000.0,
                payment_method="UPI / Net Banking",
                receipt_no="RCP-2026-001",
                notes="Paid via GPay"
            ),
            db=db,
            warden_user=warden
        )
        assert paid_fee.status == "paid"
        assert paid_fee.amount_paid == 5000.0
        print(f"[PASS] Record Payment Form: Payment recorded. Status: {paid_fee.status}, Receipt: {paid_fee.receipt_no}.")

        # =========================================================================
        # FORM 4: Student Attendance Form (Warden)
        # =========================================================================
        print("-" * 50)
        print("Testing Form 4: Attendance Save & Correction")

        # Mark Attendance
        att_res = mark_attendance(
            AttendanceMarkRequest(
                date=date(2026, 11, 1),
                records=[
                    AttendanceRecordItem(student_id=anjali_p.id, status="present"),
                    AttendanceRecordItem(student_id=himanshi_p.id, status="absent", remarks="Sick leave")
                ]
            ),
            db=db,
            warden=warden
        )
        assert "Successfully saved" in att_res["message"]
        print(f"[PASS] Mark Attendance Form: {att_res['message']}")

        # Attendance Correction
        att_rec = db.query(StudentAttendance).filter(StudentAttendance.student_id == himanshi_p.id).first()
        corrected = correct_attendance_record(
            att_rec.id,
            AttendanceUpdate(status="present", remarks="Authorized medical waiver"),
            db=db,
            warden=warden
        )
        assert corrected.status == "present"
        print(f"[PASS] Attendance Correction Form: Record #{att_rec.id} corrected to 'present'.")

        # =========================================================================
        # FORM 5: Student Leave & Outpass Forms
        # =========================================================================
        print("-" * 50)
        print("Testing Form 5: Leave & Outpass Request Forms")

        # Submit Leave
        leave = create_request(
            StudentRequestCreate(
                request_type="leave",
                start_date=date(2026, 11, 10),
                end_date=date(2026, 11, 15),
                reason="Attending family function"
            ),
            db=db,
            student_user=anjali
        )
        assert leave.id is not None
        assert leave.status == "pending"
        print(f"[PASS] Submit Leave Form: Request #{leave.id} submitted by {anjali.email}.")

        # Submit Outpass
        outpass = create_request(
            StudentRequestCreate(
                request_type="outpass",
                start_date=date(2026, 11, 2),
                end_date=date(2026, 11, 2),
                start_time="17:00",
                end_time="20:30",
                reason="Library book return"
            ),
            db=db,
            student_user=himanshi
        )
        assert outpass.id is not None
        assert outpass.status == "pending"
        print(f"[PASS] Submit Outpass Form: Request #{outpass.id} submitted by {himanshi.email}.")

        # Warden Review (Approve Leave)
        reviewed_leave = update_request_status(
            leave.id,
            StudentRequestStatusUpdate(status="approved", decision_remarks="Approved by warden"),
            db=db,
            warden=warden
        )
        assert reviewed_leave.status == "approved"
        print(f"[PASS] Review Request Form: Request #{leave.id} approved with decision remarks.")

        # Student Cancel Outpass
        cancel_res = cancel_or_delete_request(outpass.id, db=db, current_user=himanshi)
        assert "cancelled/deleted successfully" in cancel_res["message"]
        print(f"[PASS] Cancel Request Action: Outpass #{outpass.id} cancelled by student.")

        # =========================================================================
        # FORM 6: Official Notice Form
        # =========================================================================
        print("-" * 50)
        print("Testing Form 6: Notice Board Form")

        notice = create_notice(
            NoticeCreate(
                title="Diwali Hostel Timings",
                content="Main hostel gates will close at 9:00 PM during Diwali break.",
                target_role="all",
                priority="high",
                is_pinned=True
            ),
            db=db,
            manager=warden
        )
        assert notice.id is not None
        print(f"[PASS] Publish Notice Form: Notice #{notice.id} '{notice.title}' published.")

        del_notice_msg = delete_notice(notice.id, db=db, manager=warden)
        assert "deleted successfully" in del_notice_msg["message"]
        print(f"[PASS] Delete Notice Action: Notice #{notice.id} deleted.")

        # =========================================================================
        # FORM 7: Calendar Event Form
        # =========================================================================
        print("-" * 50)
        print("Testing Form 7: Calendar Event Form")

        event = create_event(
            CalendarEventCreate(
                title="Fire Safety Drill",
                description="Mandatory evacuation drill for Block A and Block B.",
                event_type="inspection",
                start_date=datetime(2026, 11, 20, 10, 0),
                end_date=datetime(2026, 11, 20, 11, 30),
                target_role="all"
            ),
            db=db,
            manager=admin
        )
        assert event.id is not None
        print(f"[PASS] Schedule Event Form: Event #{event.id} '{event.title}' scheduled.")

        del_event_msg = delete_event(event.id, db=db, manager=admin)
        assert "deleted successfully" in del_event_msg["message"]
        print(f"[PASS] Delete Event Action: Event #{event.id} removed.")

        # =========================================================================
        # FORM 8: Maintenance & Issues Form
        # =========================================================================
        print("-" * 50)
        print("Testing Form 8: Maintenance Request Form")

        issue = submit_issue(
            IssueRequestCreate(
                category="plumbing",
                title="Bathroom tap leaking",
                description="Tap in Room 101-A bathroom dripping continuously.",
                priority="medium"
            ),
            db=db,
            current_user=anjali
        )
        assert issue.id is not None
        assert issue.status == "open"
        print(f"[PASS] Submit Issue Form: Issue #{issue.id} submitted by {anjali.email}.")

        resolved_issue = update_issue_status(
            issue.id,
            IssueStatusUpdate(status="resolved", resolution_remarks="Washer replaced by plumber."),
            db=db,
            manager=warden
        )
        assert resolved_issue.status == "resolved"
        print(f"[PASS] Update Issue Status Form: Issue #{issue.id} marked as resolved.")

        # =========================================================================
        # FORM 9: User Administration Form
        # =========================================================================
        print("-" * 50)
        print("Testing Form 9: User Administration Form")

        new_student_user = create_user(
            UserAdminCreate(
                email="neha@gmail.com",
                password="password123",
                role="student",
                full_name="Neha Gupta"
            ),
            db=db,
            admin=admin
        )
        assert new_student_user.id is not None
        assert new_student_user.email == "neha@gmail.com"
        print(f"[PASS] Create User Form: Account #{new_student_user.id} ({new_student_user.email}) created.")

        updated_user = update_user(
            new_student_user.id,
            UserAdminUpdate(is_active=False),
            db=db,
            admin=admin
        )
        assert updated_user.is_active is False
        print(f"[PASS] Toggle User Status: Account #{new_student_user.id} deactivated.")

        # =========================================================================
        # FORM 10: Student Profile & Contact Form
        # =========================================================================
        print("-" * 50)
        print("Testing Form 10: Student Contact & Profile Form")

        contact_updated = update_my_contact(
            StudentContactUpdate(
                phone="9876543210",
                emergency_contact="9123456780",
                address="123 Civil Lines, Jaipur"
            ),
            db=db,
            current_user=anjali
        )
        assert contact_updated.phone == "9876543210"
        print(f"[PASS] Update Student Contact Form: Phone and emergency contact updated for {anjali.email}.")

        # =========================================================================
        # FORM 11: Settings Forms (Hostel Settings & Usability)
        # =========================================================================
        print("-" * 50)
        print("Testing Form 11: System & Usability Settings Forms")

        hostel_cfg = update_hostel_settings(
            HostelSettingsUpdate(
                hostel_name="Shree Ram Girls Hostel",
                contact_email="hostel.office@univ.edu",
                contact_phone="+91-11-23456789",
                address="North Campus, University Enclave",
                rules_policy="Curfew 9:30 PM. Silence hours 10 PM - 6 AM."
            ),
            db=db,
            admin=admin
        )
        assert hostel_cfg.hostel_name == "Shree Ram Girls Hostel"
        print(f"[PASS] Hostel Settings Form: Configuration saved for '{hostel_cfg.hostel_name}'.")

        user_prefs = update_user_settings(
            UserSettingsUpdate(theme="dark", high_contrast=True, compact_tables=True),
            db=db,
            current_user=admin
        )
        assert user_prefs.theme == "dark"
        assert user_prefs.high_contrast is True
        print(f"[PASS] Usability Settings Form: Preferences saved (Theme: {user_prefs.theme}).")

        # Change Password
        pwd_res = change_password(
            PasswordChangeRequest(old_password="12345", new_password="NewSecurePassword2026!"),
            db=db,
            current_user=admin
        )
        assert "successfully" in pwd_res["message"]
        print(f"[PASS] Change Password Form: {pwd_res['message']}")

        print("=" * 70)
        print("ALL 11 OPERATIONAL FORMS & ENDPOINTS VERIFIED: 100% SUCCESS!")
        print("=" * 70)

    finally:
        db.close()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    run_tests()
