import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import SessionLocal
from app.models.models import User

client = TestClient(app)

def test_full_workflow():
    if not settings.DB_NAME.lower().endswith("_test"):
        raise RuntimeError("Refusing to run a mutating verification script unless DB_NAME ends in _test.")

    db = SessionLocal()
    try:
        for user in db.query(User).all():
            user.password_hash = get_password_hash("12345")
            user.must_change_password = True
        db.commit()
    finally:
        db.close()

    print("=" * 60)
    print("END-TO-END OPERATIONAL LIFECYCLE & ZERO-STATE TEST")
    print("=" * 60)

    # 1. Login with all roles
    def get_token(email, password):
        r = client.post(f"/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        token = r.json()["access_token"]
        if r.json().get("must_change_password"):
            changed = client.post(
                "/api/auth/first-login-change-password",
                json={"old_password": password, "new_password": "OperationalTestPassword2026!"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert changed.status_code == 200, f"Initial password change failed for {email}: {changed.text}"
        return token

    admin_token = get_token("admin@gmail.com", "12345")
    warden_token = get_token("warden@gmail.com", "12345")
    staff_token = get_token("staff@gmail.com", "12345")
    anjali_token = get_token("anjali@gmail.com", "12345")

    admin_h = {"Authorization": f"Bearer {admin_token}"}
    warden_h = {"Authorization": f"Bearer {warden_token}"}
    staff_h = {"Authorization": f"Bearer {staff_token}"}
    anjali_h = {"Authorization": f"Bearer {anjali_token}"}

    # Verify initial summary (0 rooms, 0 dues, 0 tickets)
    initial_sum = client.get(f"/api/reports/summary", headers=admin_h).json()
    assert initial_sum["total_rooms"] == 0, "Rooms should be 0 initially"
    assert initial_sum["total_dues_outstanding"] == 0, "Dues should be 0 initially"
    assert initial_sum["pending_issues_count"] == 0, "Issues should be 0 initially"
    print("[PASS] Initial Clean State: Zero operational records confirmed.")

    # 2. Warden creates room 'B-101'
    room_resp = client.post(f"/api/rooms", json={
        "room_number": "B-101",
        "block": "Block B",
        "floor": 1,
        "capacity": 2,
        "room_type": "Double Sharing",
        "monthly_rate": 4000,
        "status": "available"
    }, headers=warden_h)
    assert room_resp.status_code == 201, f"Room creation failed: {room_resp.text}"
    room = room_resp.json()
    print(f"[PASS] Warden Operation: Created room {room['room_number']} (ID: {room['id']}).")

    # Fetch Anjali's student id
    students = client.get(f"/api/students", headers=warden_h).json()
    anjali = next(s for s in students if s["full_name"] == "Anjali")
    anjali_id = anjali["id"]

    # 3. Warden allocates bed to Anjali
    alloc_resp = client.post(f"/api/rooms/allocations", json={
        "student_id": anjali_id,
        "room_id": room["id"],
        "allocated_from": "2026-11-01",
        "remarks": "Assigned Bed 1"
    }, headers=warden_h)
    assert alloc_resp.status_code == 201, f"Allocation failed: {alloc_resp.text}"
    alloc = alloc_resp.json()
    print(f"[PASS] Warden Operation: Allocated room {room['room_number']} to Anjali.")

    # 4. Accounts Staff issues fee invoice of ₹4000
    fee_resp = client.post(f"/api/fees", json={
        "student_id": anjali_id,
        "fee_type": "Hostel Rent",
        "amount_due": 4000,
        "due_date": "2026-11-15",
        "notes": "November 2026 Rent"
    }, headers=staff_h)
    assert fee_resp.status_code == 201, f"Fee creation failed: {fee_resp.text}"
    fee = fee_resp.json()
    print(f"[PASS] Accounts Staff Operation: Created fee record of ₹{fee['amount_due']}.")

    # 5. Accounts Staff records partial payment of ₹2500
    pay_resp = client.post(f"/api/fees/{fee['id']}/pay", json={
        "amount_paying": 2500,
        "payment_method": "UPI",
        "receipt_no": "REC-78901",
        "notes": "Paid via GooglePay"
    }, headers=staff_h)
    assert pay_resp.status_code == 200, f"Payment recording failed: {pay_resp.text}"
    updated_fee = pay_resp.json()
    assert updated_fee["status"] == "partial", f"Expected partial status, got {updated_fee['status']}"
    assert updated_fee["amount_paid"] == 2500, "Paid amount should be 2500"
    print(f"[PASS] Accounts Staff Operation: Recorded payment ₹2500. Status: {updated_fee['status']}.")

    # 6. Student Anjali verifies her own view
    my_profile = client.get(f"/api/students/me", headers=anjali_h).json()
    assert "B-101" in my_profile["current_room"], f"Expected room B-101 in profile, got {my_profile['current_room']}"
    print(f"[PASS] Student Visibility: Anjali sees assigned room '{my_profile['current_room']}'.")

    my_fees = client.get(f"/api/fees", headers=anjali_h).json()
    assert len(my_fees) == 1, "Student should see exactly 1 fee invoice"
    assert my_fees[0]["amount_due"] - my_fees[0]["amount_paid"] == 1500, "Balance should be 1500"
    print("[PASS] Student Visibility: Anjali sees correct outstanding balance of ₹1500.")

    # 7. Student Anjali submits an issue
    issue_resp = client.post(f"/api/issues", json={
        "category": "plumbing",
        "title": "Shower tap leaking",
        "description": "Continuous water drip in washroom.",
        "priority": "medium"
    }, headers=anjali_h)
    assert issue_resp.status_code == 201, f"Issue submission failed: {issue_resp.text}"
    issue = issue_resp.json()
    print(f"[PASS] Student Ticket: Anjali submitted maintenance ticket #{issue['id']}.")

    # 8. Warden updates ticket status
    update_issue = client.put(f"/api/issues/{issue['id']}/status", json={
        "status": "in_progress",
        "resolution_remarks": "Plumber assigned for inspection"
    }, headers=warden_h)
    assert update_issue.status_code == 200, f"Issue update failed: {update_issue.text}"
    assert update_issue.json()["status"] == "in_progress"
    print(f"[PASS] Warden Workflow: Updated ticket #{issue['id']} to 'in_progress'.")

    # 9. Admin checks system report
    admin_sum = client.get(f"/api/reports/summary", headers=admin_h).json()
    assert admin_sum["total_rooms"] == 1
    assert admin_sum["total_capacity"] == 2
    assert admin_sum["occupied_beds"] == 1
    assert admin_sum["vacant_beds"] == 1
    assert admin_sum["occupancy_rate_percent"] == 50.0
    assert admin_sum["total_dues_outstanding"] == 1500.0
    assert admin_sum["total_collected"] == 2500.0
    assert admin_sum["pending_issues_count"] == 1
    print("[PASS] Operational Summary: Computed accurate, real-time statistics from MySQL.")

    # 10. Strict Data Rule Clean-up: Remove test records
    print("-" * 60)
    print("CLEANING UP TEST RECORDS TO MAINTAIN ZERO-STATE RULE...")
    # Delete test issue
    from app.models.models import Room, RoomAllocation, FeeRecord, IssueRequest
    db = SessionLocal()
    try:
        db.query(IssueRequest).delete()
        db.query(FeeRecord).delete()
        db.query(RoomAllocation).delete()
        db.query(Room).delete()
        for user in db.query(User).all():
            user.password_hash = get_password_hash("12345")
            user.must_change_password = True
        db.commit()
    finally:
        db.close()

    final_sum = client.get(f"/api/reports/summary", headers=admin_h).json()
    assert final_sum["total_rooms"] == 0
    assert final_sum["total_dues_outstanding"] == 0
    assert final_sum["pending_issues_count"] == 0
    print("[PASS] Clean-up Complete: Zero operational records remain. Database is pristine for user entry.")
    print("=" * 60)
    print("FULL OPERATIONAL WORKFLOW TEST: 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_workflow()
