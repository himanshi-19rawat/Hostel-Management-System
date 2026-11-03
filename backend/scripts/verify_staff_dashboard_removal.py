import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests
from app.database.session import SessionLocal
from app.models.models import User

BASE_URL = 'http://127.0.0.1:8000'

def test_staff_dashboard_removal():
    print("=" * 70)
    print("VERIFICATION: ACCOUNTS STAFF DASHBOARD REMOVAL & PERMISSIONS")
    print("=" * 70)

    # 1. Verify staff@gmail.com exists in the database
    db = SessionLocal()
    staff_user = db.query(User).filter(User.email == 'staff@gmail.com').first()
    assert staff_user is not None, "staff@gmail.com must exist in database"
    assert staff_user.role == 'accounts_staff', f"Expected role accounts_staff, got {staff_user.role}"
    assert staff_user.is_active is True, "staff account must remain active"
    print(f"[PASS] 1. Account check: {staff_user.email} (ID: {staff_user.id}, Role: {staff_user.role}) exists and active.")
    db.close()

    # 2. Login as staff@gmail.com
    r_login = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'staff@gmail.com', 'password': '12345678'})
    assert r_login.status_code == 200, f"Login failed for staff@gmail.com: {r_login.text}"
    staff_token = r_login.json()['access_token']
    staff_h = {'Authorization': f'Bearer {staff_token}'}
    print("[PASS] 2. Login successful for staff@gmail.com; JWT token issued.")

    # 3. Verify Accounts Staff blocked from Operational Reports / Dashboard backend API
    r_rep = requests.get(f'{BASE_URL}/api/reports/summary', headers=staff_h)
    assert r_rep.status_code == 403, f"Accounts staff must be blocked from reports/summary (got {r_rep.status_code})"
    print(f"[PASS] 3. Accounts Staff blocked from dashboard summary API (HTTP {r_rep.status_code} Forbidden).")

    # 4. Verify Accounts Staff blocked from fees, attendance, leave-outpass, mess inventory, rooms
    endpoints_to_block = [
        ('Fees', f'{BASE_URL}/api/fees'),
        ('Attendance', f'{BASE_URL}/api/attendance'),
        ('Leave & Outpass', f'{BASE_URL}/api/leave-outpass'),
        ('Mess Inventory', f'{BASE_URL}/api/mess/inventory'),
        ('Rooms', f'{BASE_URL}/api/rooms'),
    ]
    for label, url in endpoints_to_block:
        res = requests.get(url, headers=staff_h)
        assert res.status_code == 403, f"Expected 403 for {label}, got {res.status_code}"
        print(f"[PASS] 4. Accounts Staff strictly blocked from {label}: HTTP 403 Forbidden.")

    # 5. Verify Accounts Staff permitted endpoints (Notices, Calendar)
    r_notices = requests.get(f'{BASE_URL}/api/notices', headers=staff_h)
    assert r_notices.status_code == 200, f"Staff should be able to view notices: {r_notices.status_code}"
    r_cal = requests.get(f'{BASE_URL}/api/calendar', headers=staff_h)
    assert r_cal.status_code == 200, f"Staff should be able to view calendar: {r_cal.status_code}"
    print("[PASS] 5. Accounts Staff permitted communication access intact: Notices (200 OK), Calendar (200 OK).")

    # 6. Verify Admin, Warden, Student permissions preserved
    admin_token = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'admin@gmail.com', 'password': '12345678'}).json()['access_token']
    warden_token = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'warden@gmail.com', 'password': '12345678'}).json()['access_token']
    student_token = requests.post(f'{BASE_URL}/api/auth/login', json={'email': 'anjali@gmail.com', 'password': '12345678'}).json()['access_token']

    admin_h = {'Authorization': f'Bearer {admin_token}'}
    warden_h = {'Authorization': f'Bearer {warden_token}'}
    student_h = {'Authorization': f'Bearer {student_token}'}

    for role_name, headers in [('Admin', admin_h), ('Warden', warden_h), ('Student', student_h)]:
        r = requests.get(f'{BASE_URL}/api/reports/summary', headers=headers)
        assert r.status_code == 200, f"{role_name} reports summary failed: {r.status_code}"
        r_att = requests.get(f'{BASE_URL}/api/attendance', headers=headers)
        assert r_att.status_code == 200, f"{role_name} attendance failed: {r_att.status_code}"
        r_req = requests.get(f'{BASE_URL}/api/leave-outpass', headers=headers)
        assert r_req.status_code == 200, f"{role_name} leave-outpass failed: {r_req.status_code}"
        r_fee = requests.get(f'{BASE_URL}/api/fees', headers=headers)
        assert r_fee.status_code == 200, f"{role_name} fees failed: {r_fee.status_code}"
    print("[PASS] 6. Existing permissions for Admin, Warden, and Students preserved across all modules.")

    # 7. Inventory permissions segregation check
    assert requests.get(f'{BASE_URL}/api/mess/inventory', headers=admin_h).status_code == 200
    assert requests.get(f'{BASE_URL}/api/mess/inventory', headers=warden_h).status_code == 200
    assert requests.get(f'{BASE_URL}/api/mess/inventory', headers=student_h).status_code == 403
    assert requests.get(f'{BASE_URL}/api/mess/inventory', headers=staff_h).status_code == 403
    print("[PASS] 7. Mess inventory role segregation: Admin/Warden view allowed (200), Student/Staff blocked (403).")

    print("=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY: 100% PASS")
    print("=" * 70)

if __name__ == '__main__':
    test_staff_dashboard_removal()
