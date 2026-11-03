import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "verify_logic.db"))
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
    StudentRequest, MessInventory, FeeRecord, Room, RoomAllocation
)
from app.core.security import get_password_hash
from app.core.permissions import require_warden, require_staff, require_admin, require_admin_or_warden, require_student
from app.api.attendance import get_attendance, get_attendance_summary, mark_attendance, correct_attendance_record
from app.api.leave_outpass import list_requests, get_request_stats, create_request, update_request_status, cancel_or_delete_request
from app.api.inventory import list_inventory, create_inventory_item, update_inventory_item, delete_inventory_item
from app.api.fees import list_fees, create_fee_record, update_fee_record, record_payment
from app.schemas.schemas import (
    AttendanceMarkRequest, AttendanceRecordItem, AttendanceUpdate,
    StudentRequestCreate, StudentRequestStatusUpdate,
    MessInventoryCreate, MessInventoryUpdate,
    FeeRecordCreate, FeeRecordUpdate, FeePaymentCreate
)

def run_tests():
    print("=" * 70)
    print("HOSTEL MANAGEMENT SYSTEM - LOGICAL & PERMISSION VERIFICATION")
    print("=" * 70)

    # 1. Create all schema tables
    Base.metadata.create_all(bind=session.engine)
    db = session.SessionLocal()

    try:
        # Create the 5 required users
        admin = User(id=1, email="admin@gmail.com", password_hash=get_password_hash("12345"), role="admin", is_active=True, must_change_password=False)
        warden = User(id=2, email="warden@gmail.com", password_hash=get_password_hash("12345"), role="warden", is_active=True, must_change_password=False)
        staff = User(id=3, email="staff@gmail.com", password_hash=get_password_hash("12345"), role="accounts_staff", is_active=True, must_change_password=False)
        anjali_u = User(id=4, email="anjali@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)
        himanshi_u = User(id=5, email="himanshi@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)

        db.add_all([admin, warden, staff, anjali_u, himanshi_u])
        db.commit()

        # Profiles
        anjali_p = StudentProfile(id=1, user_id=anjali_u.id, full_name="Anjali", registration_no="STU001")
        himanshi_p = StudentProfile(id=2, user_id=himanshi_u.id, full_name="Himanshi", registration_no="STU002")
        db.add_all([anjali_p, himanshi_p])
        db.commit()

        print("[PASS] Initial Setup: 5 accounts and 2 student profiles initialized.")

        # Zero-state check on new operational tables
        assert db.query(StudentAttendance).count() == 0, "Attendance table must start with 0 records"
        assert db.query(StudentRequest).count() == 0, "Student requests must start with 0 records"
        assert db.query(MessInventory).count() == 0, "Mess inventory must start with 0 records"
        assert db.query(FeeRecord).count() == 0, "Fee records must start with 0 records"
        print("[PASS] Clean State Rule: Attendance, Requests, Inventory, Fees start with 0 records.")

        # =========================================================================
        # 1. STUDENT ATTENDANCE
        # =========================================================================
        print("-" * 50)
        print("Feature 1: Student Attendance Checks")

        # Role enforcement for attendance marking:
        # require_warden must pass for warden, but fail with 403 for admin, staff, student
        assert require_warden(warden) == warden
        for unauthorized in [admin, staff, anjali_u]:
            try:
                require_warden(unauthorized)
                assert False, f"{unauthorized.role} was not blocked by require_warden!"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Attendance Permission: Only Warden can mark attendance; Admin, Staff, Student blocked (HTTP 403).")

        # Warden marks attendance for 2026-11-01
        mark_payload = AttendanceMarkRequest(
            date="2026-11-01",
            records=[
                AttendanceRecordItem(student_id=anjali_p.id, status="present", remarks="On time"),
                AttendanceRecordItem(student_id=himanshi_p.id, status="absent", remarks="Sick"),
            ]
        )
        res = mark_attendance(mark_payload, db=db, warden=warden)
        assert "Successfully saved" in res["message"]
        assert db.query(StudentAttendance).count() == 2
        print("[PASS] Attendance Marking: Warden recorded 2 students for 2026-11-01.")

        # Duplicate prevention & authorized correction:
        # Re-marking for the exact same date updates the existing record
        correction_payload = AttendanceMarkRequest(
            date="2026-11-01",
            records=[
                AttendanceRecordItem(student_id=anjali_p.id, status="present", remarks="Confirmed"),
                AttendanceRecordItem(student_id=himanshi_p.id, status="present", remarks="Authorized correction: medical note verified"),
            ]
        )
        mark_attendance(correction_payload, db=db, warden=warden)
        # Verify row count is STILL exactly 2 (NO duplicates created!)
        assert db.query(StudentAttendance).count() == 2, "Duplicate attendance was created!"
        h_rec = db.query(StudentAttendance).filter(StudentAttendance.student_id == himanshi_p.id).first()
        assert h_rec.status == "present"
        assert "medical note verified" in h_rec.remarks
        print("[PASS] Attendance Correction & Dedup: Duplicate prevented; existing record corrected to 'present'.")

        # Student privacy: Anjali sees ONLY her own attendance
        anjali_view = get_attendance(date=None, student_id=None, db=db, current_user=anjali_u)
        assert len(anjali_view) == 1
        assert anjali_view[0].student_id == anjali_p.id
        assert anjali_view[0].status == "present"

        # Student summary
        sum_anjali = get_attendance_summary(db=db, current_user=anjali_u)
        assert sum_anjali.total_days == 1
        assert sum_anjali.present_count == 1
        assert sum_anjali.attendance_percentage == 100.0
        print("[PASS] Attendance Student Privacy: Student sees only own attendance status and 100% rate.")

        # Admin read-only oversight
        admin_view = get_attendance(date="2026-11-01", student_id=None, db=db, current_user=admin)
        assert len(admin_view) == 2
        print("[PASS] Attendance Admin Oversight: Admin successfully listed all 2 attendance records.")

        # Accounts staff forbidden
        try:
            get_attendance(date=None, student_id=None, db=db, current_user=staff)
            assert False, "Staff should be forbidden"
        except HTTPException as e:
            assert e.status_code == 403
        print("[PASS] Attendance Segregation: Accounts staff forbidden from attendance register (HTTP 403).")

        # =========================================================================
        # 2. STUDENT LEAVE AND OUTPASS REQUESTS
        # =========================================================================
        print("-" * 50)
        print("Feature 2: Student Leave & Outpass Requests")

        # Student Anjali creates Leave Request
        leave_req = create_request(
            StudentRequestCreate(
                request_type="leave",
                start_date="2026-11-10",
                end_date="2026-11-15",
                reason="Attending family celebration"
            ),
            db=db,
            student_user=anjali_u
        )
        assert leave_req.status == "pending"
        assert leave_req.request_type == "leave"
        assert leave_req.student_id == anjali_p.id
        print(f"[PASS] Leave Workflow: Anjali submitted Leave request #{leave_req.id} (Status: pending).")

        # Student Himanshi creates Outpass Request
        outpass_req = create_request(
            StudentRequestCreate(
                request_type="outpass",
                start_date="2026-11-04",
                end_date="2026-11-04",
                start_time="17:00",
                end_time="20:00",
                reason="Library project study"
            ),
            db=db,
            student_user=himanshi_u
        )
        assert outpass_req.status == "pending"
        assert outpass_req.request_type == "outpass"
        assert outpass_req.student_id == himanshi_p.id
        print(f"[PASS] Outpass Workflow: Himanshi submitted Outpass request #{outpass_req.id} (Status: pending).")

        # Ownership & isolation: Anjali must NOT see Himanshi's requests
        anjali_requests = list_requests(request_type=None, status_filter=None, student_id=None, db=db, current_user=anjali_u)
        assert len(anjali_requests) == 1
        assert anjali_requests[0].id == leave_req.id
        print("[PASS] Request Isolation: Anjali sees only her own leave request.")

        # Warden reviews and decides: Approve Leave, Reject Outpass
        reviewed_leave = update_request_status(
            leave_req.id,
            StudentRequestStatusUpdate(status="approved", decision_remarks="Parent consent verified"),
            db=db,
            warden=warden
        )
        assert reviewed_leave.status == "approved"
        assert reviewed_leave.decision_remarks == "Parent consent verified"

        reviewed_outpass = update_request_status(
            outpass_req.id,
            StudentRequestStatusUpdate(status="rejected", decision_remarks="Weekday study curfew applies"),
            db=db,
            warden=warden
        )
        assert reviewed_outpass.status == "rejected"
        print("[PASS] Warden Decision Workflow: Warden approved leave and rejected outpass with decision notes.")

        # Admin read-only oversight: can view all requests
        admin_reqs = list_requests(request_type=None, status_filter=None, student_id=None, db=db, current_user=admin)
        assert len(admin_reqs) == 2

        # Admin blocked from reviewing/deciding requests (require_warden)
        try:
            require_warden(admin)
            assert False, "Admin must not have warden approval rights"
        except HTTPException as e:
            assert e.status_code == 403
        print("[PASS] Request Admin Oversight: Admin has read-only oversight and cannot review/decide (HTTP 403).")

        # =========================================================================
        # 3. MESS STOCK / INVENTORY
        # =========================================================================
        print("-" * 50)
        print("Feature 3: Mess Stock & Inventory (Warden Sole Management; Admin Read-Only)")

        # Starts empty
        initial_inv = list_inventory(category=None, db=db, current_user=warden)
        assert len(initial_inv) == 0
        print("[PASS] Zero-State: Mess inventory has 0 preloaded items.")

        # Warden is the only role that can add real stock
        rice = create_inventory_item(
            MessInventoryCreate(
                item_name="Basmati Rice",
                category="Grains & Cereals",
                quantity=100.0,
                unit="kg",
                min_threshold=20.0,
                unit_price=70.0,
                notes="Warehouse bay 1"
            ),
            db=db,
            warden=warden
        )
        assert rice.quantity == 100.0
        assert rice.item_name == "Basmati Rice"

        oil = create_inventory_item(
            MessInventoryCreate(
                item_name="Sunflower Cooking Oil",
                category="Cooking Oils & Ghee",
                quantity=10.0,
                unit="L",
                min_threshold=15.0,
                unit_price=130.0,
                notes="Near low stock threshold"
            ),
            db=db,
            warden=warden
        )
        assert oil.quantity == 10.0

        temp_dal = create_inventory_item(
            MessInventoryCreate(
                item_name="Toor Dal",
                category="Pulses & Legumes",
                quantity=25.0,
                unit="kg",
                min_threshold=5.0,
                unit_price=140.0,
                notes="Temporary batch to test deletion"
            ),
            db=db,
            warden=warden
        )
        assert temp_dal.item_name == "Toor Dal"
        print("[PASS] Warden Stock Creation: Warden added Basmati Rice, Sunflower Oil, and Toor Dal.")

        # Warden updates stock
        updated_rice = update_inventory_item(
            rice.id,
            MessInventoryUpdate(quantity=90.0, notes="Used 10kg for dinner"),
            db=db,
            warden=warden
        )
        assert updated_rice.quantity == 90.0
        print("[PASS] Warden Stock Update: Warden adjusted Basmati Rice quantity to 90.0 kg.")

        # Warden deletes stock
        del_result = delete_inventory_item(temp_dal.id, db=db, warden=warden)
        assert "deleted successfully" in del_result["message"]
        remaining_items = list_inventory(category=None, db=db, current_user=warden)
        assert len(remaining_items) == 2
        print("[PASS] Warden Stock Deletion: Warden deleted Toor Dal successfully.")

        # Admin has READ-ONLY access
        admin_inv = list_inventory(category=None, db=db, current_user=admin)
        assert len(admin_inv) == 2
        print("[PASS] Admin Read-Only Oversight: Admin can view all 2 inventory records.")

        # Admin is strictly BLOCKED from add, edit, or delete (require_warden blocks admin)
        for action_name, action_fn in [
            ("add", lambda: create_inventory_item(MessInventoryCreate(item_name="Blocked", category="Other Provisions", quantity=1, unit="kg"), db=db, warden=require_warden(admin))),
            ("update", lambda: update_inventory_item(rice.id, MessInventoryUpdate(quantity=50.0), db=db, warden=require_warden(admin))),
            ("delete", lambda: delete_inventory_item(rice.id, db=db, warden=require_warden(admin)))
        ]:
            try:
                action_fn()
                assert False, f"Admin must NOT be allowed to {action_name} mess inventory"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Admin Mutation Block: Admin is blocked from adding, editing, or deleting inventory (HTTP 403).")

        # Accounts Staff and Student have NO inventory access (list blocked with HTTP 403)
        for unauthorized_user in [staff, anjali_u, himanshi_u]:
            try:
                list_inventory(category=None, db=db, current_user=require_admin_or_warden(unauthorized_user))
                assert False, f"{unauthorized_user.role} must not have mess inventory access"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Staff & Student Prohibition: Accounts Staff and Students have zero access to mess inventory (HTTP 403).")

        # =========================================================================
        # 4. FEES AND ROLE PERMISSIONS
        # =========================================================================
        print("-" * 50)
        print("Feature 4: Fees and Role Permissions (Warden-Only Management)")

        # A) Only Warden can create, edit, or collect fees
        assert require_warden(warden) == warden
        for non_warden in [admin, staff, anjali_u]:
            try:
                require_warden(non_warden)
                assert False, f"{non_warden.role} should be blocked by require_warden on fees"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Warden Fee Exclusivity: Warden is the ONLY role permitted to create/manage fees & collections (HTTP 403 for Admin, Staff, Student).")

        # Accounts Staff MUST NOT create, edit, collect, or update fees (HTTP 403 Forbidden)
        try:
            list_fees(db=db, current_user=staff)
            assert False, "Accounts staff should be forbidden from fee ledger"
        except HTTPException as e:
            assert e.status_code == 403
            assert "Accounts Staff must not create, edit, collect, or update fees" in e.detail
        print("[PASS] Accounts Staff Prohibition: Accounts Staff blocked from fees endpoint (HTTP 403).")

        # Warden creates fee record
        fee_entry = create_fee_record(
            FeeRecordCreate(
                student_id=anjali_p.id,
                fee_type="Hostel Room & Mess Fee",
                amount_due=8000.0,
                due_date="2026-11-25",
                notes="Term 1 fee"
            ),
            db=db,
            warden_user=warden
        )
        assert fee_entry.amount_due == 8000.0
        assert fee_entry.status == "pending"
        print(f"[PASS] Fee Issuance: Warden created fee invoice #{fee_entry.id} (Status: pending).")

        # B) Admin has READ-ONLY access to fee status (seeing collected vs pending)
        admin_fees = list_fees(db=db, current_user=admin)
        assert len(admin_fees) == 1
        assert admin_fees[0].status == "pending"
        assert admin_fees[0].amount_due == 8000.0
        print("[PASS] Admin Read-Only Oversight: Admin can view fee status (pending vs collected) across students.")

        # Admin CANNOT record payment or create fees (blocked by require_warden)
        try:
            record_payment(
                fee_entry.id,
                FeePaymentCreate(amount_paying=4000.0, payment_method="Cash"),
                db=db,
                warden_user=require_warden(admin)
            )
            assert False, "Admin should not be able to record payments"
        except HTTPException as e:
            assert e.status_code == 403
        print("[PASS] Payment Exclusivity: Admin cannot record collections (HTTP 403).")

        # C) Warden records payment collection
        paid_res = record_payment(
            fee_entry.id,
            FeePaymentCreate(amount_paying=8000.0, payment_method="Bank Transfer", receipt_no="REC-2026-001", notes="Settled in full"),
            db=db,
            warden_user=warden
        )
        assert paid_res.status == "paid"
        assert paid_res.receipt_no == "REC-2026-001"
        assert paid_res.amount_paid == 8000.0
        print("[PASS] Collection Execution: Warden recorded payment; status transitioned to 'paid' with official receipt.")

        # D) Student can only view own fee status and receipts
        anjali_fees = list_fees(db=db, current_user=anjali_u)
        assert len(anjali_fees) == 1
        assert anjali_fees[0].receipt_no == "REC-2026-001"
        assert anjali_fees[0].status == "paid"

        himanshi_fees = list_fees(db=db, current_user=himanshi_u)
        assert len(himanshi_fees) == 0, "Himanshi should not see Anjali's fee invoice"
        print("[PASS] Student Fee Isolation: Anjali sees her own receipt; Himanshi sees 0 fees.")

        print("=" * 70)
        print("ALL VERIFICATION CHECKS PASSED: 100% SUCCESS!")
        print("=" * 70)

    finally:
        db.close()
        session.engine.dispose()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    run_tests()
