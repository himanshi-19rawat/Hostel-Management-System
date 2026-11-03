# Hostel Management System Q03 Improve Usability

Student TQM project using React and TypeScript, Python with FastAPI, and MySQL. This copy contains the application source and setup scripts. Verification results below are updated only after running the stated checks in this workspace.

## Stakeholder Accounts

The database supports accounts for all five stakeholder roles, authenticated with salted bcrypt password hashes. There is no public self-registration.

| Role | Login | Initial / Test Password | Description |
|---|---|---|---|
| Administrator | `admin@gmail.com` | `12345` / `12345678` | System administrator with full oversight and user management |
| Warden | `warden@gmail.com` | `12345` / `12345678` | Hostel operations, room allocations, fees, and leave approvals |
| Student (Anjali) | `anjali@gmail.com` | `12345` / `12345678` | Resident student (Roll: REG2024001, Block A, Room 101) |
| Student (Himanshi) | `himanshi@gmail.com` | `12345` / `12345678` | Resident student (Roll: REG2024002) |
| Parent | `parent@gmail.com` | `12345678` | Parent account linked to student Anjali for presence monitoring |
| Staff | `staff@gmail.com` | `12345` / `12345678` | Security & gate staff for check-in/out logging |

Initial setup creates the two required student profiles and user preference records. Rooms, room allocations, fees, notices, calendar events, issue requests, and TQM evidence start empty. The setup process does not invent hostel contact details or rules. An administrator can enter the actual hostel settings in the app.

## Windows setup

Prerequisites: Python 3.10 or later, Node.js 18 or later, and MySQL 8 / MariaDB (XAMPP is suitable).

1. Start MySQL. Create a database named `hostel_management` using the provided `database/schema.sql`, or let `backend/scripts/init_db.py` create the tables after the database itself exists.
2. In `backend`, copy `.env.example` to `.env`. Set the MySQL credentials and a unique JWT secret. Generate a secret with:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

3. Install backend dependencies and initialize the five accounts:

   ```powershell
   cd <project-folder>\backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python scripts\init_db.py
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. In a second PowerShell window, install and start the frontend:

   ```powershell
   cd <project-folder>\frontend
   npm install
   npm run dev
   ```

5. Open `http://127.0.0.1:5173/`. The API documentation is at `http://127.0.0.1:8000/docs`.

Replace `<project-folder>` with the folder containing this README. Do not commit `backend/.env` or share its JWT/database secrets.

## Stakeholder Roles & Access Permissions

The Hostel Management System supports five distinct stakeholder roles: **Admin, Warden, Student, Parent, and Staff**, with strict role-based access control (RBAC) enforced on both the FastAPI backend and React frontend.

1. **Administrator (`admin@gmail.com`):**
   - Full management oversight: user account administration (create, activate, deactivate, reset passwords), parent-student linking, hostel parameters, room assets, and bed allocations.
   - Comprehensive oversight of student presence on the **Campus Activity Map** (check-in/check-out logs and leave statuses).
   - Read-only oversight of attendance records, fee statements, leave/outpass requests, and mess inventory (mutations strictly blocked with HTTP 403 Forbidden).

2. **Warden (`warden@gmail.com`):**
   - Supervises student residential operations, allocates room beds, publishes official announcements, and resolves maintenance tickets.
   - **Student Attendance:** Marks and corrects the daily attendance register (duplicate prevention included).
   - **Fees & Collections:** Sole role authorized to manage fee records, issue billing invoices, and record payments.
   - **Leave & Outpass Approvals:** Reviews separate student Leave and Outpass requests with approval/rejection and decision notes.
   - **Mess Inventory:** Sole role authorized to add, edit, adjust stock quantities, and remove kitchen inventory items.
   - **Campus Activity Map:** Monitors all student check-in/out statuses, logs gate entries/exits, and tracks approved leaves.

3. **Student (`anjali@gmail.com`, `himanshi@gmail.com`):**
   - Resident portal: views personal room allocation, attendance rate, fee invoices, receipts, and maintenance requests.
   - **Leave & Outpass:** Submits multi-day Leave or same-day Outpass applications and tracks real-time status and warden notes.
   - **Campus Presence & Activity:** Views personal presence status and can record self check-in/out at campus checkpoints.
   - Strictly forbidden from modifying attendance registers, reviewing other students' data, managing fees, or accessing mess inventory.

4. **Parent (`parent@gmail.com`):**
   - Dedicated Parent Portal: strictly scoped to view **only their linked student's information** (presence status, check-in/out activity logs, and leave status).
   - Real-time presence indicators on whether their ward is `Checked In` (hostel/campus), `Checked Out` (departed campus), or `On Approved Leave` (with departure date, return date, and reason).
   - Access to campus notice board announcements, hostel calendar, and account settings.
   - Strictly forbidden from accessing other students' records, financial collections, inventory, attendance marking, or administrative controls.

5. **Staff (`staff@gmail.com`):**
   - Dedicated Staff Operations Console: access strictly tailored for assigned gate and campus security duties.
   - **Gate Check-In / Check-Out:** Records student entries and exits with timestamp, checkpoint location (e.g. Main Gate), and remarks.
   - **Campus Activity Map:** Views overall student presence counts and movement audit logs.
   - Access to staff announcements, hostel calendar, and personal settings.
   - Strictly blocked from student fee registers, room allocations, attendance marking, leave approvals, and user administration.

### Campus Activity Map & Presence Tracking Safeguards

- **Status Markers:** Clear status distinction between `Checked In` (green), `Checked Out` (orange), and `On Approved Leave` (purple, displaying sanctioned departure and expected return details).
- **Usable Audit History:** Complete chronological audit log of gate entries and exits with student identity, timestamp, checkpoint location, recorder, and optional remarks.
- **Privacy & Safeguards:** Zero live GPS or invasive device tracking is used; presence status is derived exclusively from sanctioned gate checkpoints and approved leave/outpass records.
- **Data Scoping:** Parents are strictly restricted to their linked student profile via `parent_student_links`.

### Permissions Matrix

| Feature / Module | Administrator | Warden | Student | Parent | Staff |
|---|---|---|---|---|---|
| **Role Dashboard** | Admin Control Center | Warden Operations Console | Resident Portal | Ward Monitoring Portal | Staff Duty Console |
| **Campus Activity Map** | Full Campus Oversight & Logging | Full Campus Oversight & Logging | Self Presence & Logging | Linked Student Only (Read-Only) | Gate Presence & Movement Logging |
| **Gate Check-In / Out Logging** | Full Logging Access | Full Logging Access | Self Check-In / Out | Blocked (HTTP 403) | Full Logging Access |
| **Notice Board** | Full Management / Publish | Full Management / Publish | View Announcements | View Announcements | View Staff Announcements |
| **Calendar & Reminders** | Create / View Events | Create / View Events | View Events | View Events | View Shift / Hostel Events |
| **Usability Settings** | Manage Preferences | Manage Preferences | Manage Preferences | Manage Preferences | Manage Preferences |
| **Fees & Collections** | Read-Only Oversight | Full Management & Collections | View Own Invoices & Dues | Blocked (HTTP 403) | Blocked (HTTP 403) |
| **Student Attendance** | Read-Only Oversight | Mark / Correct Roster | View Own Attendance | Blocked (HTTP 403) | Blocked (HTTP 403) |
| **Leave & Outpass** | Read-Only Oversight | Approve / Reject Requests | Submit & Track Own Requests | View Linked Student Status | Blocked (HTTP 403) |
| **Mess Inventory** | Read-Only Oversight | Full CRUD & Stock Updates | Blocked (HTTP 403) | Blocked (HTTP 403) | Blocked (HTTP 403) |
| **Room Allocations** | Full Asset Management | Bed Allocations | View Own Room | Blocked (HTTP 403) | Blocked (HTTP 403) |
| **User Administration & Links** | Full CRUD & Parent Linking | No Access | No Access | No Access | No Access |
| **Fees & Collections** | Read-Only Oversight | Full Management & Collections | View Own Dues & Invoices | **Blocked (HTTP 403 Forbidden)** |
| **Student Attendance** | Read-Only Oversight | Mark / Correct Roster | View Own Attendance | **Blocked (HTTP 403 Forbidden)** |
| **Leave & Outpass** | Read-Only Oversight | Approve / Reject Requests | Submit & Track Own Requests | **Blocked (HTTP 403 Forbidden)** |
| **Mess Inventory** | Read-Only Oversight | Full Add / Edit / Stock CRUD | **Blocked (HTTP 403 Forbidden)** | **Blocked (HTTP 403 Forbidden)** |
| **Room Management** | Full Asset Management | Bed Allocations | View Allocated Room | **Blocked (HTTP 403 Forbidden)** |
| **User Administration** | Full CRUD | No Access | No Access | **Blocked (HTTP 403 Forbidden)** |
| **Operational Reports** | View Global Reports | View Global Reports | View Personal Stats | **Blocked (HTTP 403 Forbidden)** |

Backend permissions are strictly enforced on API routes (`HTTP 403 Forbidden` on unauthorized actions). Initial-password accounts may read their own profile and change the initial password; other API operations are blocked until that change succeeds.

## TQM features & navigation update

The connected TQM section (Voice of Customer, CTQ, SIPOC, FMEA with server-calculated RPN, defect logging, and PDCA cycles) remains fully implemented with its database tables and backend APIs intact. In accordance with interface usability requirements, the TQM Framework page is hidden from the sidebar navigation and dashboard shortcuts so users cannot navigate to it through the UI, preserving all underlying data.

## Checks & verification results

The following automated and build checks were run directly in this workspace:

1. **Frontend Production Build & TypeScript Verification (`npm run build`):**
   - Result: **PASSED (0 errors)**.
   - Vite compiled 2,067 modules into production bundles with strict TypeScript type-checking (`tsc -b`).
2. **Backend Logic & Role Permissions Verification (`verify_backend_logic.py`):**
   - Result: **PASSED (100% of assertions)**.
   - Verified zero-state clean initialization for Attendance, Requests, Inventory, and Fees.
   - Verified Warden attendance marking, duplicate prevention, and authorized correction.
   - Verified Student private attendance viewing and calculation.
   - Verified Student Leave & Outpass submission, student data isolation, and Warden approval/rejection with decision notes.
   - Verified Mess Inventory permissions: Warden is the sole role that can add, edit, update quantities, or delete mess inventory records; Admin has read-only access (all mutation attempts blocked with HTTP 403); Accounts Staff and Students have zero inventory access (HTTP 403 on list and edit).
   - Verified Warden fee exclusivity (`POST /api/fees`, `POST /api/fees/{id}/pay`); verified Accounts Staff prohibition from fee management/collections (HTTP 403); verified Admin read-only fee access (HTTP 403 on creation/collection).
   - Verified First-login password change gate and role segregation.

Other checks (such as physical hardware peripherals or external live MySQL instances) remain **pending**.

## Main folders

- `backend/app`: FastAPI routes, permissions, schemas, and SQLAlchemy models.
- `backend/scripts`: account initialization and verification scripts.
- `frontend/src`: React pages, role dashboards, and API client.
- `database/schema.sql`: MySQL schema.
- `docs/TQM_Project_Report_Q03_Usability.md`: project report draft. Field measurements and any test results not run in this workspace are marked pending.
