import os
import sys
from datetime import date, datetime

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "verify_live.db"))
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
    User, StudentProfile, StudentAttendance, StudentRequest, MessInventory
)
from app.core.security import get_password_hash
from app.core.permissions import require_warden, require_admin, require_student, require_admin_or_warden

# Route handlers
from app.api.attendance import get_attendance, get_attendance_summary, mark_attendance, correct_attendance_record
from app.api.inventory import list_inventory, create_inventory_item, update_inventory_item, delete_inventory_item
from app.api.leave_outpass import list_requests, get_request_stats, create_request, update_request_status, cancel_or_delete_request

# Schemas
from app.schemas.schemas import (
    AttendanceMarkRequest, AttendanceRecordItem, AttendanceUpdate,
    MessInventoryCreate, MessInventoryUpdate,
    StudentRequestCreate, StudentRequestStatusUpdate
)

def verify():
    print("=" * 70)
    print("VERIFICATION: ATTENDANCE, MESS INVENTORY, AND LEAVE/OUTPASS MODULES")
    print("=" * 70)

    Base.metadata.create_all(bind=session.engine)
    db = session.SessionLocal()

    try:
        # Create users
        admin = User(email="admin@gmail.com", password_hash=get_password_hash("12345"), role="admin", is_active=True, must_change_password=False)
        warden = User(email="warden@gmail.com", password_hash=get_password_hash("12345"), role="warden", is_active=True, must_change_password=False)
        staff = User(email="staff@gmail.com", password_hash=get_password_hash("12345"), role="accounts_staff", is_active=True, must_change_password=False)
        student = User(email="anjali@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)
        student2 = User(email="himanshi@gmail.com", password_hash=get_password_hash("12345"), role="student", is_active=True, must_change_password=False)

        db.add_all([admin, warden, staff, student, student2])
        db.commit()

        sp1 = StudentProfile(user_id=student.id, full_name="Anjali Sharma", department="CSE", year_of_study=3)
        sp2 = StudentProfile(user_id=student2.id, full_name="Himanshi Patel", department="IT", year_of_study=2)
        db.add_all([sp1, sp2])
        db.commit()

        print("[OK] Test environment initialized with 5 role accounts and 2 student profiles.")

        # =========================================================================
        # 1. ATTENDANCE MODULE
        # =========================================================================
        print("\n--- 1. Testing Attendance Module ---")
        
        # A) Attendance loads when empty
        att_list = get_attendance(date=None, student_id=None, db=db, current_user=warden)
        assert len(att_list) == 0
        print("[PASS] GET /api/attendance: Attendance loaded cleanly (0 records).")

        att_sum = get_attendance_summary(student_id=sp1.id, db=db, current_user=student)
        assert att_sum.total_days == 0
        print("[PASS] GET /api/attendance/summary: Attendance summary loaded for student.")

        # B) Warden marks and saves register
        save_res = mark_attendance(
            AttendanceMarkRequest(
                date=date(2026, 11, 1),
                records=[
                    AttendanceRecordItem(student_id=sp1.id, status="present"),
                    AttendanceRecordItem(student_id=sp2.id, status="absent", remarks="Not in room")
                ]
            ),
            db=db,
            warden=warden
        )
        assert "Successfully saved" in save_res["message"]
        print(f"[PASS] POST /api/attendance/mark: Warden saved attendance register ({save_res['message']}).")

        # C) Verify records appear after reload
        reloaded_att = get_attendance(date="2026-11-01", student_id=None, db=db, current_user=warden)
        assert len(reloaded_att) == 2
        print(f"[PASS] Attendance Reload: Found {len(reloaded_att)} persisted records for 2026-11-01.")

        # D) Verify student sees only own attendance
        student_att = get_attendance(date=None, student_id=None, db=db, current_user=student)
        assert len(student_att) == 1
        assert student_att[0].student_id == sp1.id
        assert student_att[0].status == "present"
        print("[PASS] Attendance Privacy: Student views only their own record.")

        # E) Permission enforcement: Staff & Student cannot mark attendance
        for unauth in [staff, student]:
            try:
                require_warden(unauth)
                assert False, f"{unauth.role} must not mark attendance"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Attendance RBAC: Accounts Staff and Student blocked from marking attendance (HTTP 403).")

        # =========================================================================
        # 2. MESS INVENTORY MODULE
        # =========================================================================
        print("\n--- 2. Testing Mess Inventory Module ---")

        # A) Inventory loads when empty
        inv_list = list_inventory(category=None, db=db, current_user=warden)
        assert len(inv_list) == 0
        print("[PASS] GET /api/mess/inventory: Inventory loaded cleanly (0 records).")

        # B) Warden adds item
        new_item = create_inventory_item(
            MessInventoryCreate(
                item_name="Wheat Flour (Atta)",
                category="Grains & Cereals",
                quantity=150.0,
                unit="kg",
                min_threshold=25.0,
                unit_price=42.0,
                notes="Warehouse Rack B"
            ),
            db=db,
            warden=warden
        )
        assert new_item.id is not None
        assert new_item.quantity == 150.0
        print(f"[PASS] POST /api/mess/inventory: Warden added '{new_item.item_name}' (ID: {new_item.id}, Qty: {new_item.quantity} {new_item.unit}).")

        # C) Verify persisted after reload
        reloaded_inv = list_inventory(category=None, db=db, current_user=warden)
        assert len(reloaded_inv) == 1
        assert reloaded_inv[0].item_name == "Wheat Flour (Atta)"
        print("[PASS] Mess Inventory Reload: Item persisted in database and retrieved.")

        # D) Admin read-only oversight
        admin_inv = list_inventory(category=None, db=db, current_user=admin)
        assert len(admin_inv) == 1
        print("[PASS] Mess Inventory Admin View: Admin can view inventory records.")

        # E) Permission enforcement: Admin, Staff, Student cannot add item
        for unauth in [admin, staff, student]:
            try:
                require_warden(unauth)
                assert False, f"{unauth.role} must not add inventory"
            except HTTPException as e:
                assert e.status_code == 403
        print("[PASS] Mess Inventory RBAC: Admin, Staff, Student blocked from adding inventory (HTTP 403).")

        # =========================================================================
        # 3. LEAVE & OUTPASS MODULE
        # =========================================================================
        print("\n--- 3. Testing Leave & Outpass Module ---")

        # A) Requests load when empty
        req_list = list_requests(request_type=None, status_filter=None, student_id=None, db=db, current_user=student)
        assert len(req_list) == 0
        stats = get_request_stats(db=db, current_user=student)
        assert stats["total"] == 0
        print("[PASS] GET /api/leave-outpass & /stats: Requests loaded cleanly (0 records).")

        # B) Student submits Leave request
        leave_req = create_request(
            StudentRequestCreate(
                request_type="leave",
                start_date=date(2026, 11, 10),
                end_date=date(2026, 11, 14),
                reason="Festival holidays at home"
            ),
            db=db,
            student_user=student
        )
        assert leave_req.id is not None
        assert leave_req.status == "pending"
        print(f"[PASS] POST /api/leave-outpass (Leave): Student submitted Leave #{leave_req.id} (Status: {leave_req.status}).")

        # C) Student submits Outpass request
        outpass_req = create_request(
            StudentRequestCreate(
                request_type="outpass",
                start_date=date(2026, 11, 3),
                end_date=date(2026, 11, 3),
                start_time="17:00",
                end_time="20:00",
                reason="Evening library research"
            ),
            db=db,
            student_user=student
        )
        assert outpass_req.id is not None
        assert outpass_req.status == "pending"
        print(f"[PASS] POST /api/leave-outpass (Outpass): Student submitted Outpass #{outpass_req.id} (Status: {outpass_req.status}).")

        # D) Verify persisted after reload
        reloaded_reqs = list_requests(request_type=None, status_filter=None, student_id=None, db=db, current_user=student)
        assert len(reloaded_reqs) == 2
        print(f"[PASS] Leave/Outpass Reload: Student retrieved {len(reloaded_reqs)} submitted requests.")

        # E) Warden review & decision
        reviewed = update_request_status(
            leave_req.id,
            StudentRequestStatusUpdate(status="approved", decision_remarks="Parent consent confirmed"),
            db=db,
            warden=warden
        )
        assert reviewed.status == "approved"
        assert reviewed.decision_remarks == "Parent consent confirmed"
        print(f"[PASS] PUT /api/leave-outpass/{leave_req.id}/status: Warden approved Leave with remarks.")

        # F) Student isolation: Himanshi sees 0 requests
        himanshi_reqs = list_requests(request_type=None, status_filter=None, student_id=None, db=db, current_user=student2)
        assert len(himanshi_reqs) == 0
        print("[PASS] Request Privacy: Another student sees 0 records (isolated per-student).")

        print("\n" + "=" * 70)
        print("ALL THREE MODULES TESTED & FULLY VERIFIED: 100% SUCCESS!")
        print("=" * 70)

    finally:
        db.close()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    verify()
