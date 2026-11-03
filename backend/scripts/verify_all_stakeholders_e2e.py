import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    resp = requests.post(url, json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"FAILED to login as {email}: {resp.status_code} {resp.text}")
        return None, None
    data = resp.json()
    token = data["access_token"]
    return token, data

def main():
    print("======================================================================")
    print("Comprehensive Verification: 5 Stakeholder Roles & Activity Map")
    print("Stakeholders: Admin, Warden, Student, Parent, Staff")
    print("======================================================================")

    # 1. Authenticate All 5 Roles
    tokens = {}
    users = {}
    accounts = [
        ("admin", "admin@gmail.com", "12345678"),
        ("warden", "warden@gmail.com", "12345678"),
        ("student", "anjali@gmail.com", "12345678"),
        ("parent", "parent@gmail.com", "12345678"),
        ("staff", "staff@gmail.com", "12345678"),
    ]

    for role_name, email, password in accounts:
        token, user = login(email, password)
        if not token:
            print(f"[FAIL] Could not log in {role_name} ({email})")
            sys.exit(1)
        tokens[role_name] = token
        users[role_name] = user
        print(f"[PASS] {role_name.upper()} Logged in: {email} (Role: {user['role']}, Name: {user.get('full_name')})")

    # 2. Check Student Status via GET /api/activity/status across roles
    print("\n--- Testing GET /api/activity/status ---")
    
    # Admin
    h_admin = {"Authorization": f"Bearer {tokens['admin']}"}
    r_admin = requests.get(f"{BASE_URL}/api/activity/status", headers=h_admin)
    assert r_admin.status_code == 200, f"Admin status failed: {r_admin.text}"
    admin_statuses = r_admin.json()
    print(f"[PASS] Admin retrieved {len(admin_statuses)} student statuses:")
    for st in admin_statuses:
        print(f"       Student: {st['student_name']} | Status: {st['current_status']} | Room: {st.get('room_number')}")
    assert len(admin_statuses) >= 2, "Admin should see all students"

    # Warden
    h_warden = {"Authorization": f"Bearer {tokens['warden']}"}
    r_warden = requests.get(f"{BASE_URL}/api/activity/status", headers=h_warden)
    assert r_warden.status_code == 200
    assert len(r_warden.json()) == len(admin_statuses), "Warden should see all students"
    print(f"[PASS] Warden retrieved {len(r_warden.json())} student statuses.")

    # Staff
    h_staff = {"Authorization": f"Bearer {tokens['staff']}"}
    r_staff = requests.get(f"{BASE_URL}/api/activity/status", headers=h_staff)
    assert r_staff.status_code == 200
    assert len(r_staff.json()) == len(admin_statuses), "Staff should see all students"
    print(f"[PASS] Staff retrieved {len(r_staff.json())} student statuses.")

    # Student (Anjali)
    h_student = {"Authorization": f"Bearer {tokens['student']}"}
    r_student = requests.get(f"{BASE_URL}/api/activity/status", headers=h_student)
    assert r_student.status_code == 200
    student_statuses = r_student.json()
    assert len(student_statuses) == 1, "Student should only see self"
    assert "Anjali" in student_statuses[0]["student_name"]
    print(f"[PASS] Student correctly scoped to 1 record: {student_statuses[0]['student_name']} (Status: {student_statuses[0]['current_status']})")

    # Parent (Linked to Anjali)
    h_parent = {"Authorization": f"Bearer {tokens['parent']}"}
    r_parent = requests.get(f"{BASE_URL}/api/activity/status", headers=h_parent)
    assert r_parent.status_code == 200
    parent_statuses = r_parent.json()
    assert len(parent_statuses) == 1, "Parent should ONLY see linked student"
    assert "Anjali" in parent_statuses[0]["student_name"]
    print(f"[PASS] Parent strictly scoped to linked student: {parent_statuses[0]['student_name']} (Status: {parent_statuses[0]['current_status']})")

    # 3. Test Staff Check-In / Check-Out Gate Logging
    print("\n--- Testing Staff Gate Check-In & Check-Out Logging ---")
    anjali_id = student_statuses[0]["student_id"]
    
    # Log Check-Out by Staff
    r_logout = requests.post(f"{BASE_URL}/api/activity/log", headers=h_staff, json={
        "student_id": anjali_id,
        "activity_type": "check_out",
        "location": "Main Campus Gate",
        "remarks": "Leaving for weekend study session"
    })
    assert r_logout.status_code in (200, 201), f"Check-out failed: {r_logout.text}"
    print(f"[PASS] Staff successfully recorded Check-Out for student {anjali_id}")

    # Verify status changed to checked_out
    r_status_after_out = requests.get(f"{BASE_URL}/api/activity/status", headers=h_staff).json()
    anjali_status = next(s for s in r_status_after_out if s["student_id"] == anjali_id)
    assert anjali_status["current_status"] == "checked_out", f"Expected checked_out, got {anjali_status['current_status']}"
    print(f"[PASS] Verified presence status transitioned to: '{anjali_status['current_status']}'")

    # Log Check-In by Staff
    r_login = requests.post(f"{BASE_URL}/api/activity/log", headers=h_staff, json={
        "student_id": anjali_id,
        "activity_type": "check_in",
        "location": "Main Campus Gate",
        "remarks": "Returned to campus hostel"
    })
    assert r_login.status_code in (200, 201), f"Check-in failed: {r_login.text}"
    print(f"[PASS] Staff successfully recorded Check-In for student {anjali_id}")

    # Verify status changed back to checked_in
    r_status_after_in = requests.get(f"{BASE_URL}/api/activity/status", headers=h_parent).json()
    assert r_status_after_in[0]["current_status"] == "checked_in", f"Expected checked_in, got {r_status_after_in[0]['current_status']}"
    print(f"[PASS] Parent immediately sees updated status: '{r_status_after_in[0]['current_status']}'")

    # 4. Test Safeguards & Permission Boundaries
    print("\n--- Testing RBAC Security & Permission Safeguards ---")

    # Parent attempting to record activity log -> MUST BE 403 Forbidden
    r_p_log = requests.post(f"{BASE_URL}/api/activity/log", headers=h_parent, json={
        "student_id": anjali_id,
        "activity_type": "check_in",
    })
    assert r_p_log.status_code == 403, f"Parent should be blocked from logging activity, got {r_p_log.status_code}"
    print("[PASS] Parent forbidden from recording gate logs (HTTP 403 Forbidden)")

    # Staff blocked from Fees
    r_staff_fees = requests.get(f"{BASE_URL}/api/fees", headers=h_staff)
    assert r_staff_fees.status_code == 403, f"Staff should be blocked from fees, got {r_staff_fees.status_code}"
    print("[PASS] Staff blocked from Fees API (HTTP 403 Forbidden)")

    # Staff blocked from Mess Inventory
    r_staff_inv = requests.get(f"{BASE_URL}/api/mess/inventory", headers=h_staff)
    assert r_staff_inv.status_code == 403, f"Staff should be blocked from mess inventory, got {r_staff_inv.status_code}"
    print("[PASS] Staff blocked from Mess Inventory API (HTTP 403 Forbidden)")

    # Staff blocked from Attendance Marking
    r_staff_att = requests.post(f"{BASE_URL}/api/attendance/mark", headers=h_staff, json={
        "date": "2026-11-02",
        "records": [{"student_id": anjali_id, "status": "present"}]
    })
    assert r_staff_att.status_code == 403, f"Staff should be blocked from attendance, got {r_staff_att.status_code}"
    print("[PASS] Staff blocked from Attendance Marking (HTTP 403 Forbidden)")

    # Parent blocked from Fees
    r_parent_fees = requests.get(f"{BASE_URL}/api/fees", headers=h_parent)
    assert r_parent_fees.status_code == 403, f"Parent should be blocked from fees, got {r_parent_fees.status_code}"
    print("[PASS] Parent blocked from Fees API (HTTP 403 Forbidden)")

    # Parent blocked from User Administration
    r_parent_users = requests.get(f"{BASE_URL}/api/users", headers=h_parent)
    assert r_parent_users.status_code == 403, f"Parent should be blocked from user admin, got {r_parent_users.status_code}"
    print("[PASS] Parent blocked from User Administration (HTTP 403 Forbidden)")

    # Student blocked from Mess Inventory
    r_student_inv = requests.get(f"{BASE_URL}/api/mess/inventory", headers=h_student)
    assert r_student_inv.status_code == 403, f"Student should be blocked from mess inventory, got {r_student_inv.status_code}"
    print("[PASS] Student blocked from Mess Inventory API (HTTP 403 Forbidden)")

    # Warden can access Mess Inventory
    r_warden_inv = requests.get(f"{BASE_URL}/api/mess/inventory", headers=h_warden)
    assert r_warden_inv.status_code == 200, f"Warden should access mess inventory, got {r_warden_inv.status_code}"
    print(f"[PASS] Warden successfully accessed Mess Inventory ({len(r_warden_inv.json())} items)")

    # Admin has Read-Only access to Mess Inventory
    r_admin_inv = requests.get(f"{BASE_URL}/api/mess/inventory", headers=h_admin)
    assert r_admin_inv.status_code == 200, f"Admin should view mess inventory, got {r_admin_inv.status_code}"
    print(f"[PASS] Admin has read-only access to Mess Inventory ({len(r_admin_inv.json())} items)")

    # Admin mutation on Mess Inventory is blocked
    r_admin_post_inv = requests.post(f"{BASE_URL}/api/mess/inventory", headers=h_admin, json={
        "item_name": "Test Rice",
        "category": "Grains",
        "quantity": 10,
        "unit": "kg"
    })
    assert r_admin_post_inv.status_code == 403, f"Admin should NOT be allowed to mutate inventory, got {r_admin_post_inv.status_code}"
    print("[PASS] Admin mutation of Mess Inventory blocked (HTTP 403 Forbidden)")

    # 5. Parent-Student Links API (Admin)
    print("\n--- Testing Parent-Student Links Management (Admin) ---")
    r_links = requests.get(f"{BASE_URL}/api/activity/parent-links", headers=h_admin)
    assert r_links.status_code == 200, f"Get links failed: {r_links.text}"
    links = r_links.json()
    print(f"[PASS] Admin retrieved {len(links)} parent-student links:")
    for lk in links:
        print(f"       Link #{lk['id']}: Parent {lk['parent_email']} -> Student {lk['student_name']} ({lk['relationship']})")
    assert len(links) >= 1

    print("\n======================================================================")
    print("ALL TESTS PASSED: 100% of stakeholder role, activity map, and RBAC checks succeeded.")
    print("======================================================================")

if __name__ == "__main__":
    main()
