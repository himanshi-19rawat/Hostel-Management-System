import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.models import Room, FeeRecord, RoomAllocation, IssueRequest, Notice, CalendarEvent, StudentProfile, User

client = TestClient(app)

def run_tests():
    if not settings.DB_NAME.lower().endswith("_test"):
        raise RuntimeError("Refusing to run a mutating verification script unless DB_NAME ends in _test.")
    print("=" * 60)
    print("HOSTEL MANAGEMENT SYSTEM - ROLE PERMISSION VERIFICATION")
    print("=" * 60)

    # 1. Verify all operational tables are EMPTY initially
    db = SessionLocal()
    try:
        assert db.query(Room).count() == 0, "Rooms table must be empty!"
        assert db.query(RoomAllocation).count() == 0, "RoomAllocations must be empty!"
        assert db.query(FeeRecord).count() == 0, "FeeRecords must be empty!"
        assert db.query(IssueRequest).count() == 0, "IssueRequests must be empty!"
        assert db.query(Notice).count() == 0, "Notices must be empty!"
        assert db.query(CalendarEvent).count() == 0, "CalendarEvents must be empty!"
        print("[PASS] Strict Data Rule: All operational tables are 100% clean and empty.")
    finally:
        db.close()

    # 2. Test Login for all 5 roles
    credentials = [
        ("admin@gmail.com", "12345", "admin"),
        ("anjali@gmail.com", "12345", "student"),
        ("himanshi@gmail.com", "12345", "student"),
        ("warden@gmail.com", "12345", "warden"),
        ("staff@gmail.com", "12345", "accounts_staff"),
    ]

    tokens = {}
    for email, password, expected_role in credentials:
        resp = client.post(f"/api/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        data = resp.json()
        assert data["role"] == expected_role, f"Role mismatch for {email}"
        assert "access_token" in data, f"No token for {email}"
        tokens[email] = data["access_token"]
        print(f"[PASS] Authentication: Successfully logged in as {email} with role '{data['role']}'.")

    # Confirm the backend blocks application APIs until each initial password
    # has been changed, then change them only inside the disposable test DB.
    admin_headers = {"Authorization": f"Bearer {tokens['admin@gmail.com']}"}
    forced_gate = client.get(f"/api/reports/summary", headers=admin_headers)
    assert forced_gate.status_code == 403, "Temporary-password tokens must be blocked from application APIs"
    temporary_test_password = "RoleCheckPassword2026!"
    for email, _, _ in credentials:
        changed = client.post(
            "/api/auth/first-login-change-password",
            json={"old_password": "12345", "new_password": temporary_test_password},
            headers={"Authorization": f"Bearer {tokens[email]}"},
        )
        assert changed.status_code == 200, f"Initial password change failed for {email}: {changed.text}"
    print("[PASS] First-login gate: protected routes are blocked until password change; all five accounts changed in test DB.")

    # 3. Test Invalid Credentials
    bad_resp = client.post(f"/api/auth/login", json={"email": "admin@gmail.com", "password": "wrongpassword"})
    assert bad_resp.status_code == 401, "Expected 401 on bad password"
    print("[PASS] Security: Invalid password rejected with HTTP 401.")

    # 4. Role Permission: Admin vs Others on /api/users
    admin_headers = {"Authorization": f"Bearer {tokens['admin@gmail.com']}"}
    admin_users = client.get(f"/api/users", headers=admin_headers)
    assert admin_users.status_code == 200, f"Admin failed to access /api/users: {admin_users.text}"
    assert len(admin_users.json()) == 5, f"Expected 5 initial accounts, found {len(admin_users.json())}"
    print(f"[PASS] Admin Authorization: Admin successfully accessed user management ({len(admin_users.json())} accounts listed).")

    # Warden must be forbidden from /api/users
    warden_headers = {"Authorization": f"Bearer {tokens['warden@gmail.com']}"}
    warden_users = client.get(f"/api/users", headers=warden_headers)
    assert warden_users.status_code == 403, f"Warden should be forbidden from /api/users, got {warden_users.status_code}"
    print("[PASS] Access Control: Warden blocked from user management (HTTP 403).")

    # Staff must be forbidden from /api/users
    staff_headers = {"Authorization": f"Bearer {tokens['staff@gmail.com']}"}
    staff_users = client.get(f"/api/users", headers=staff_headers)
    assert staff_users.status_code == 403, f"Staff should be forbidden from /api/users, got {staff_users.status_code}"
    print("[PASS] Access Control: Accounts Staff blocked from user management (HTTP 403).")

    # Student must be forbidden from /api/users
    anjali_headers = {"Authorization": f"Bearer {tokens['anjali@gmail.com']}"}
    student_users = client.get(f"/api/users", headers=anjali_headers)
    assert student_users.status_code == 403, f"Student should be forbidden from /api/users, got {student_users.status_code}"
    print("[PASS] Access Control: Student blocked from user management (HTTP 403).")

    # 5. Role Permission: Student directory access
    # Students CANNOT see list of all students
    student_dir = client.get(f"/api/students", headers=anjali_headers)
    assert student_dir.status_code == 403, "Student should not be able to list all students"
    print("[PASS] Privacy: Student blocked from listing other students (HTTP 403).")

    # Warden CAN list students
    warden_dir = client.get(f"/api/students", headers=warden_headers)
    assert warden_dir.status_code == 200, "Warden should be able to list students"
    print(f"[PASS] Warden Authorization: Warden successfully listed student directory ({len(warden_dir.json())} students).")

    # Student can view own profile
    my_profile = client.get(f"/api/students/me", headers=anjali_headers)
    assert my_profile.status_code == 200, "Student should access own profile"
    assert my_profile.json()["full_name"] == "Anjali", "Expected Anjali's profile"
    print("[PASS] Student Profile: Student successfully accessed own profile.")

    # Student CANNOT view another student's profile directly
    himanshi_headers = {"Authorization": f"Bearer {tokens['himanshi@gmail.com']}"}
    himanshi_profile = client.get(f"/api/students/me", headers=himanshi_headers).json()
    himanshi_id = himanshi_profile["id"]

    cross_profile = client.get(f"/api/students/{himanshi_id}", headers=anjali_headers)
    assert cross_profile.status_code == 403, "Student must not be allowed to view another student's profile!"
    print("[PASS] Student Data Isolation: Student Anjali blocked from viewing Himanshi's profile (HTTP 403).")

    # 6. Role Permission: Accounts Staff vs Rooms
    staff_room_create = client.post(f"/api/rooms", json={"room_number": "A-101", "block": "Block A", "capacity": 2}, headers=staff_headers)
    assert staff_room_create.status_code == 403, "Staff must be forbidden from creating rooms!"
    print("[PASS] Role Segregation: Accounts Staff blocked from managing rooms (HTTP 403).")

    # Warden CAN manage rooms
    warden_room_create = client.post(f"/api/rooms", json={"room_number": "A-101", "block": "Block A", "capacity": 2, "monthly_rate": 4500}, headers=warden_headers)
    assert warden_room_create.status_code == 201, f"Warden failed to create room: {warden_room_create.text}"
    created_room = warden_room_create.json()
    print(f"[PASS] Warden Operations: Warden successfully created room '{created_room['room_number']}'.")

    # Clean up test room to ensure clean state
    del_room = client.delete(f"/api/rooms/{created_room['id']}", headers=warden_headers)
    assert del_room.status_code == 200
    print("[PASS] Cleanup: Test room removed. Operational tables remain strictly user-entered.")

    print("=" * 60)
    db = SessionLocal()
    try:
        for user in db.query(User).all():
            user.password_hash = get_password_hash("12345")
            user.must_change_password = True
        db.commit()
    finally:
        db.close()

    print("ROLE PERMISSION & AUTHENTICATION CHECKS PASSED.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
