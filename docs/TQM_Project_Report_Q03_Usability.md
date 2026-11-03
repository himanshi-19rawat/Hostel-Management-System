# Hostel Management System Q03 Improve Usability

## Project Synopsis and Report Draft

**Course:** BBAT104 TQM Project  
**Academic year:** 2026–2027  
**Student:** Himanshi Rawat  
**Roll number:** 2410301027  
**Branch and section:** CSE, A  
**Project:** Hostel Management System — Q03 Improve Usability  
**Guide and moderator:** To be completed from institute instructions

## Abstract

This project develops a hostel management web application with a usability-improvement focus. The selected stack is React with TypeScript, Python with FastAPI, and MySQL. The application is intended to support role-based management of student profiles, rooms and allocations, fees, notices, calendar events, and student issue requests. Its TQM area includes Voice of Customer and usability evidence, CTQ, SIPOC, FMEA with calculated RPN, defect logging, and PDCA.

The initial setup is limited to the five accounts specified for the project. Operational hostel records and TQM evidence are entered by users and are not preloaded. Implementation and field evaluation are separate: survey responses, user-task observations, before/after measurements, and live deployment results remain pending until collected and verified.

**Keywords:** Total Quality Management, usability, hostel management, role-based access, Voice of Customer, CTQ, SIPOC, FMEA, PDCA

## Acknowledgement

To be completed by the student after confirming the preferred acknowledgement and guide details.

## 1. Introduction

### 1.1 Background

Hostel administration involves resident information, room assignments, fee tracking, announcements, calendar activities, and issue reporting. This project brings those workflows into one application and focuses on making each role’s tasks easier to find and complete.

### 1.2 System overview

The application has four roles: Administrator, Warden, Accounts Staff, and Student. React and TypeScript provide the browser interface. FastAPI exposes the application API and enforces role access. MySQL stores account, hostel, and quality records.

### 1.3 Problem statement

The project addresses the need for a clear, role-appropriate interface for common hostel tasks, with searchable records, readable forms, visible empty states, and access restrictions for private student and fee information.

### 1.4 Need for the project

The project provides one connected interface for hostel workflows and a place to record usability requirements, defects, risks, and improvement actions. Whether it improves task time or user satisfaction must be measured with actual users; those results have not yet been collected.

### 1.5 Objectives

- Provide task-focused dashboards and navigation for each assigned role.
- Connect a React/TypeScript frontend to a Python/FastAPI backend and MySQL database.
- Restrict each role to its permitted functions and records.
- Let authorized users enter hostel and TQM data without sample records.
- Provide usability support such as search, filters, theme preferences, validation, and clear empty states.
- Record quality evidence and improvement work using VoC, CTQ, SIPOC, FMEA, defect logging, and PDCA.

### 1.6 Scope

The system covers accounts, student profiles, rooms, room allocations, fees and payments, notices, calendar events, student issue requests, user preferences, hostel settings, and the TQM modules listed above. Empirical usability evaluation remains outside the completed implementation until participants and observations are available.

### 1.7 Expected outcomes

The intended outcomes are connected role-based workflows, a usable empty-state experience, and a structured way to record quality improvement work. Actual improvement will be reported only after field data is collected.

## 2. Review of Literature and TQM Concepts

### 2.1 Total Quality Management

The project uses customer focus, process thinking, fact-based decisions, and continuous improvement as its TQM framing. Project findings and measurements must come from actual observations entered during evaluation.

### 2.2 Usability and customer requirements

Usability requirements are to be identified from actual user feedback and task observations. No survey result or customer quotation is included in this draft.

### 2.3 Quality tools

- **Voice of Customer:** records stakeholder feedback and usability evidence.
- **CTQ:** links a confirmed user need to a measurable quality requirement.
- **SIPOC:** documents suppliers, inputs, process steps, outputs, and customers for a selected process.
- **FMEA:** records failure modes and calculates RPN as severity × occurrence × detection.
- **Defect log:** captures reported defects and corrective action status.
- **PDCA:** records plan, do, check, and act stages for an improvement cycle.

### 2.4 Existing studies and project gap

Relevant research sources and a project-specific gap analysis have not yet been added. They should be completed using sources actually consulted; no citations or study findings are fabricated here.

## 3. Materials and Method

### 3.1 Technology and architecture

- Frontend: React, TypeScript, and Vite.
- Backend: Python, FastAPI, Pydantic, and SQLAlchemy.
- Database: MySQL-compatible relational schema.
- API: REST endpoints using bearer-token authentication.

**Request flow:** User → React/TypeScript interface → FastAPI validation and role checks → MySQL read/write → API response → updated interface.

### 3.2 Account setup and data collection

Initial setup creates only `admin@gmail.com`, `anjali@gmail.com`, `himanshi@gmail.com`, `warden@gmail.com`, and `staff@gmail.com`, all with the requested temporary password. Passwords are stored as bcrypt hashes. Users must change the temporary password before accessing application functions. The two student accounts have corresponding student profiles; their other personal details remain blank until supplied.

Rooms, allocations, fee entries, payments, notices, calendar events, issue requests, and TQM records start empty. No survey responses or operational records are seeded. Hostel contact details and rules are entered by the Administrator if applicable.

### 3.3 Role workflows and permissions

| Role | Main tasks | Boundaries |
|---|---|---|
| Administrator | Manage accounts, roles, hostel settings, rooms, and allocations; read-only oversight of attendance, leave/outpasses, and mess inventory; read-only oversight of fee status. | Cannot create, edit, or collect fees (restricted to Warden); cannot add, edit, update, or delete mess inventory (restricted to Warden); cannot mark attendance or decide student requests. All edit controls hidden in dashboard. |
| Warden | Manage student details, rooms and allocations, notices, calendar events, issue requests; exclusively manage and collect fees; mark/correct daily student attendance; review & approve/reject leave and outpasses with decision notes; sole management of mess stock inventory (add, edit, update quantities, delete). | Cannot manage user accounts or roles. |
| Accounts Staff | Has general staff view access and can submit usability feedback and defect logs. | Must not create, edit, collect, or update fee records; zero access to mess inventory; cannot manage accounts, rooms, or student attendance. |
| Student | View own profile, room allocation, private fee status and receipts, personal attendance ledger; submit separate leave and outpass requests; cancel pending requests; submit issue tickets. | Zero access to mess inventory; cannot access another student’s private records, cannot mark attendance, and cannot approve requests. |

The API is the permission boundary; frontend navigation and controls mirror those permissions.

### 3.4 Data model

The schema defines core tables for users, student profiles, rooms, allocations, fee records, notices, calendar events, issue requests, user settings, hostel settings, student attendance (`student_attendance`), student requests (`student_requests`), and mess inventory (`mess_inventory`). TQM tables cover VoC, CTQ, SIPOC, FMEA, defects, and PDCA. Operational, inventory, attendance, and request tables contain no preloaded entries.

### 3.5 Process identification and evaluation method

The project workflow to be evaluated is: sign in, locate a permitted module, complete a task, receive a clear result, and verify the stored record. Task completion time, errors, satisfaction ratings, and before/after comparison are pending field collection.

## 4. Results and Discussion

### 4.1 Implementation inventory

Source review found connected frontend pages and backend routes for all hostel modules (attendance, leave & outpass, mess inventory, fees, rooms, notices, calendar, issues) and TQM backend routes. The TQM Framework page has been removed from UI navigation shortcuts and sidebar while keeping all underlying database tables and API logic intact.

### 4.2 Security and data handling changes in this revision

- **Student Attendance:** Warden selects dates and marks Present/Absent. Duplicate records for the same student and date are prevented; subsequent submissions apply as authorized corrections. Students are restricted to viewing only their own attendance history.
- **Leave and Outpass Requests:** Separate student workflows for overnight Leave and same-day Outpass. Students can view and cancel only their own requests. Wardens review and approve/reject with decision remarks.
- **Mess Inventory:** Warden is the **only role** that can add, edit, update quantities, or delete mess inventory records. Administrator has strictly **read-only access** to view records and stock status, with all edit controls hidden from the Admin dashboard and UI. Accounts Staff and Students have **no access** to mess inventory. Starts empty with zero preloaded data.
- **Fee Permissions Correction:** The Warden is the sole authorized role that creates/manages fee records, issues invoices, and records payment collections. Accounts Staff must not create, edit, collect, or update fees (HTTP 403 Forbidden). Administrator has read-only oversight to see collected vs pending status. Students view only their own fee status and receipts. Existing fee records are preserved.
- **UI Navigation:** Removed TQM Framework navigation link from the left sidebar and dashboard to hide the page without deleting its implementation or data.

### 4.3 Verification status

The following tests were executed and verified in this workspace:
- **Frontend Build (`npm run build`):** PASSED with 0 errors (strict TypeScript compile and Vite asset bundling across 2,067 modules).
- **Backend API & Role Permissions Suite (`verify_backend_logic.py`):** PASSED (100% of assertion checks covering attendance marking, duplicate prevention, student isolation, leave/outpass review workflows, mess inventory warden-only management and admin read-only access, accounts staff and student prohibition, and fee permissions segregation).

Field measurements, user task-completion timings, and external live MySQL production deployments remain **pending field verification**.

### 4.4 Field results and comparison

No user survey responses, usability scores, task-time measurements, complaint-resolution statistics, or before/after results have been collected for this report. These items remain **pending field collection**.

## 5. Conclusion and Future Work

### 5.1 Conclusion

The project source provides the planned hostel-management modules and a TQM area for recording usability evidence and improvement work. The report does not claim measured usability improvement until a real evaluation is completed.

### 5.2 Limitations

- The supplied institute report template and supervisor details were not present in the copied project folder.
- Automated checks and role-specific browser views still need to be verified in the copied environment.
- Usability evidence and operational performance measurements have not been collected.
- Existing external databases are not altered by this project-copy review.

### 5.3 Future work

Run safe automated checks against a disposable test database, inspect each role’s dashboard at laptop and smaller viewports, collect real user feedback, measure selected tasks, and complete the report with verified references and field results.

## References

To be completed with books, papers, or official sources actually consulted and cited in the final report. No unverified references are listed in this draft.

## Abbreviations

API — Application Programming Interface; CTQ — Critical to Quality; FMEA — Failure Mode and Effects Analysis; PDCA — Plan-Do-Check-Act; RPN — Risk Priority Number; SIPOC — Suppliers, Inputs, Process, Outputs, Customers; TQM — Total Quality Management; VoC — Voice of Customer.
