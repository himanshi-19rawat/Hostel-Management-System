import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.database.session import SessionLocal
from app.models.models import (
    User, TqmVoC, TqmCtq, TqmSipoc, TqmFmea, TqmDefect, TqmPdca
)
from app.core.security import get_password_hash

client = TestClient(app)

def run_checks():
    if not settings.DB_NAME.lower().endswith("_test"):
        raise RuntimeError("Refusing to run a mutating verification script unless DB_NAME ends in _test.")
    print("=" * 65)
    print("VERIFICATION: 5 ACCOUNTS, FIRST-LOGIN PASS CHANGE & TQM FRAMEWORK")
    print("=" * 65)

    # 1. Verify Only 5 Accounts Exist & Must Change Password = True
    db = SessionLocal()
    try:
        assert db.query(TqmVoC).count() == 0
        assert db.query(TqmCtq).count() == 0
        assert db.query(TqmSipoc).count() == 0
        assert db.query(TqmFmea).count() == 0
        assert db.query(TqmDefect).count() == 0
        assert db.query(TqmPdca).count() == 0
        users = db.query(User).all()
        assert len(users) == 5, f"Expected exactly 5 accounts, found {len(users)}"
        expected_emails = {"admin@gmail.com", "anjali@gmail.com", "himanshi@gmail.com", "warden@gmail.com", "staff@gmail.com"}
        found_emails = {u.email for u in users}
        assert found_emails == expected_emails, f"Email mismatch: {found_emails}"
        for u in users:
            assert u.must_change_password is True, f"User {u.email} should have must_change_password=True"
        print(f"[PASS] Exact 5 Accounts Verified. All 5 set to must_change_password=True.")
    finally:
        db.close()

    # 2. Test Login & must_change_password flag in token response
    login_resp = client.post(f"/api/auth/login", json={"email": "admin@gmail.com", "password": "12345"}).json()
    assert login_resp["must_change_password"] is True, "Login response must have must_change_password=True"
    admin_token = login_resp["access_token"]
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Authentication: Login successfully returns must_change_password=True.")
    blocked_before_change = client.get(f"/api/reports/summary", headers=admin_h)
    assert blocked_before_change.status_code == 403, "Temporary-password token must not access application APIs"

    # 3. Test First-Login Password Change Endpoint
    # Bad old password rejection
    bad_old = client.post(f"/api/auth/first-login-change-password", json={"old_password": "wrong", "new_password": "NewSecretPass1"}, headers=admin_h)
    assert bad_old.status_code == 400, f"Expected 400 for wrong old password, got {bad_old.status_code}"
    
    # Identical new password rejection
    same_pass = client.post(f"/api/auth/first-login-change-password", json={"old_password": "12345", "new_password": "12345"}, headers=admin_h)
    assert same_pass.status_code == 422, "Expected validation rejection for a too-short password"

    # Successful password change
    succ_pass = client.post(f"/api/auth/first-login-change-password", json={"old_password": "12345", "new_password": "AdminNewPassword2026"}, headers=admin_h)
    assert succ_pass.status_code == 200, f"Password change failed: {succ_pass.text}"

    # Verify must_change_password is now False
    re_login = client.post(f"/api/auth/login", json={"email": "admin@gmail.com", "password": "AdminNewPassword2026"}).json()
    assert re_login["must_change_password"] is False, "After change, must_change_password should be False"
    admin_token = re_login["access_token"]
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] First-Login Security: Successfully forced and processed initial password change.")

    # Get student token
    student_login = client.post(f"/api/auth/login", json={"email": "anjali@gmail.com", "password": "12345"}).json()
    student_h = {"Authorization": f"Bearer {student_login['access_token']}"}
    student_changed = client.post(f"/api/auth/first-login-change-password", json={"old_password": "12345", "new_password": "StudentTestPassword2026!"}, headers=student_h)
    assert student_changed.status_code == 200, f"Student first-login password change failed: {student_changed.text}"

    # Get warden token
    warden_login = client.post(f"/api/auth/login", json={"email": "warden@gmail.com", "password": "12345"}).json()
    warden_h = {"Authorization": f"Bearer {warden_login['access_token']}"}
    warden_changed = client.post(f"/api/auth/first-login-change-password", json={"old_password": "12345", "new_password": "WardenTestPassword2026!"}, headers=warden_h)
    assert warden_changed.status_code == 200, f"Warden first-login password change failed: {warden_changed.text}"

    # 4. TQM Feature: Voice of Customer (VoC)
    voc_create = client.post(f"/api/tqm/voc", json={
        "feedback_category": "Usability & Navigation",
        "customer_verbatim": "Room allocation status was instantly visible on my mobile screen.",
        "key_issue": "Mobile responsiveness verification",
        "satisfaction_rating": 5,
        "usability_metric": "SUS Score: 88"
    }, headers=student_h)
    assert voc_create.status_code == 201, f"VoC creation failed: {voc_create.text}"
    voc = voc_create.json()
    print(f"[PASS] TQM VoC: Student submitted VoC usability evidence (ID: {voc['id']}).")

    # 5. TQM Feature: Critical to Quality (CTQ)
    # Student blocked from creating CTQ
    ctq_student = client.post(f"/api/tqm/ctq", json={
        "need_statement": "Fast login",
        "quality_driver": "Quick UI",
        "ctq_metric": "Auth latency",
        "target_specification": "< 500ms"
    }, headers=student_h)
    assert ctq_student.status_code == 403, "Student must be blocked from adding CTQ specifications"
    print("[PASS] Access Control: Student blocked from modifying CTQ specifications (HTTP 403).")

    # Admin creates CTQ
    ctq_create = client.post(f"/api/tqm/ctq", json={
        "need_statement": "Streamlined room check-in",
        "quality_driver": "Zero manual paperwork",
        "ctq_metric": "Check-in time per student",
        "target_specification": "< 60 seconds",
        "lower_limit": "0 sec",
        "upper_limit": "120 sec"
    }, headers=admin_h)
    assert ctq_create.status_code == 201, f"CTQ creation failed: {ctq_create.text}"
    ctq = ctq_create.json()
    print(f"[PASS] TQM CTQ: Admin defined CTQ specification (ID: {ctq['id']}).")

    # 6. TQM Feature: SIPOC Process Mapping
    sipoc_create = client.post(f"/api/tqm/sipoc", json={
        "process_name": "Hostel Room Allocation Workflow",
        "supplier": "University Admissions & Student",
        "inputs": "Student ID, Room Capacity Matrix",
        "process_steps": "1. Verify eligibility -> 2. Select vacant room -> 3. Assign bed -> 4. Issue invoice",
        "outputs": "Active Bed Allocation & Room Key Receipt",
        "customer": "Student Resident & Chief Warden"
    }, headers=warden_h)
    assert sipoc_create.status_code == 201, f"SIPOC creation failed: {sipoc_create.text}"
    sipoc = sipoc_create.json()
    print(f"[PASS] TQM SIPOC: Warden mapped SIPOC process flow (ID: {sipoc['id']}).")

    # 7. TQM Feature: FMEA with RPN Calculation
    # Student blocked from accessing FMEA register
    fmea_student = client.get(f"/api/tqm/fmea", headers=student_h)
    assert fmea_student.status_code == 403, "Student should not have access to institutional FMEA register"
    print("[PASS] Access Control: Student restricted from FMEA risk register (HTTP 403).")

    # Warden creates FMEA failure mode: Severity 8, Occurrence 2, Detection 3 => RPN = 8 * 2 * 3 = 48
    fmea_create = client.post(f"/api/tqm/fmea", json={
        "process_step": "Room Bed Allocation",
        "potential_failure_mode": "Over-allocation beyond physical bed capacity",
        "potential_effect": "Resident room overcrowding",
        "severity": 8,
        "potential_cause": "Race condition during simultaneous bed selection",
        "occurrence": 2,
        "current_controls": "Backend transactional occupancy verification",
        "detection": 3,
        "recommended_action": "Strict database capacity validation"
    }, headers=warden_h)
    assert fmea_create.status_code == 201, f"FMEA creation failed: {fmea_create.text}"
    fmea = fmea_create.json()
    assert fmea["rpn"] == 48, f"Expected RPN=48, got {fmea['rpn']}"
    print(f"[PASS] TQM FMEA: Failure mode created with verified RPN calculation (S=8, O=2, D=3 => RPN={fmea['rpn']}).")

    # 8. TQM Feature: Defect Logging & Remediation
    # Student logs usability defect
    defect_create = client.post(f"/api/tqm/defects", json={
        "title": "Horizontal scroll bar missing on tablet view",
        "description": "Observed on 768px tablet portrait viewport.",
        "defect_type": "ui_display",
        "severity": "minor"
    }, headers=student_h)
    assert defect_create.status_code == 201, f"Defect logging failed: {defect_create.text}"
    defect = defect_create.json()
    print(f"[PASS] TQM Defect Logging: Student logged quality defect (ID: #{defect['id']}).")

    # Warden remediates defect
    defect_update = client.put(f"/api/tqm/defects/{defect['id']}", json={
        "root_cause": "Missing overflow-x wrapper on table container",
        "corrective_action": "Applied .table-responsive-wrapper with webkit touch scrolling",
        "status": "verified_closed"
    }, headers=warden_h)
    assert defect_update.status_code == 200, f"Defect update failed: {defect_update.text}"
    assert defect_update.json()["status"] == "verified_closed"
    print(f"[PASS] TQM Remediation: Warden updated defect #{defect['id']} to 'verified_closed'.")

    # 9. TQM Feature: PDCA Continuous Improvement Cycle
    pdca_create = client.post(f"/api/tqm/pdca", json={
        "cycle_name": "PDCA-Q03-Cycle-1: Navigation Usability",
        "target_objective": "Improve SUS score to > 85",
        "plan_stage": "Plan: Audit non-responsive views and implement WCAG 2.1 contrast.",
        "do_stage": "Do: Deploy React collapsible sidebar and dark/light themes.",
        "check_stage": "Check: Gather student survey feedback on task completion speed.",
        "act_stage": "Act: Standardize layout template across all modules.",
        "status": "standardized"
    }, headers=admin_h)
    assert pdca_create.status_code == 201, f"PDCA creation failed: {pdca_create.text}"
    pdca = pdca_create.json()
    print(f"[PASS] TQM PDCA: Admin created PDCA continuous improvement cycle (ID: {pdca['id']}).")

    # 10. Clean Up Test Records (Strict Data Rule: ZERO DUMMY DATA)
    print("-" * 65)
    print("CLEANING UP TEST RECORDS TO MAINTAIN ZERO OPERATIONAL DATA...")
    db = SessionLocal()
    try:
        db.query(TqmVoC).delete()
        db.query(TqmCtq).delete()
        db.query(TqmSipoc).delete()
        db.query(TqmFmea).delete()
        db.query(TqmDefect).delete()
        db.query(TqmPdca).delete()
        
        # Restore all test accounts to the seeded state after the isolated run.
        for account in db.query(User).all():
            account.password_hash = get_password_hash("12345")
            account.must_change_password = True
        db.commit()

        # Re-verify all TQM tables are empty
        assert db.query(TqmVoC).count() == 0
        assert db.query(TqmCtq).count() == 0
        assert db.query(TqmSipoc).count() == 0
        assert db.query(TqmFmea).count() == 0
        assert db.query(TqmDefect).count() == 0
        assert db.query(TqmPdca).count() == 0
        print("[PASS] Pristine Database Restored: All 6 TQM tables are completely empty.")
        print("[PASS] All test accounts restored to initial password state.")
    finally:
        db.close()

    print("=" * 65)
    print("ALL FIRST-LOGIN SECURITY & TQM FRAMEWORK CHECKS PASSED (100% SUCCESS)!")
    print("=" * 65)

if __name__ == "__main__":
    run_checks()
