import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_9_slide_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    C_BG = RGBColor(248, 250, 252)         # Slate 50
    C_CARD_BG = RGBColor(255, 255, 255)    # White
    C_BORDER = RGBColor(226, 232, 240)     # Slate 200
    C_HEADING = RGBColor(15, 23, 42)       # Slate 900
    C_ACCENT = RGBColor(37, 99, 235)       # Blue 600
    C_BODY = RGBColor(51, 65, 85)          # Slate 700

    def set_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()

        # Clean card backdrop
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.6), Inches(11.733), Inches(6.3))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)
        return card

    def add_slide_header(slide, title_text):
        tb = slide.shapes.add_textbox(Inches(1.2), Inches(0.9), Inches(10.9), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(40)
        p.font.bold = True
        p.font.color.rgb = C_HEADING

        # Elegant accent underline
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.05), Inches(2.2), Inches(0.06))
        line.fill.solid()
        line.fill.fore_color.rgb = C_ACCENT
        line.line.fill.background()

    def add_bullet_content(slide, bullets, left=1.2, top=2.3, width=10.9, height=4.2):
        tb = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        for i, text in enumerate(bullets):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"•  {text}"
            p.font.size = Pt(20)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(14)
            p.line_spacing = 1.15

    # ============================================================
    # SLIDE 1: Title Slide
    # ============================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1)

    tb1 = s1.shapes.add_textbox(Inches(1.2), Inches(1.5), Inches(10.9), Inches(2.2))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "Hostel Management System"
    p1.font.size = Pt(40)
    p1.font.bold = True
    p1.font.color.rgb = C_HEADING

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "Unified Residential Administration, Safety & Governance Platform"
    p1_sub.font.size = Pt(20)
    p1_sub.font.color.rgb = C_ACCENT
    p1_sub.font.bold = True
    p1_sub.space_before = Pt(8)

    # Accent underline
    line1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.8), Inches(3.0), Inches(0.06))
    line1.fill.solid()
    line1.fill.fore_color.rgb = C_ACCENT
    line1.line.fill.background()

    add_bullet_content(s1, [
        "Automated end-to-end residential lifecycle from admission to permanent checkout.",
        "Role-Based Access Control engineered for Admin, Warden, Student, Parent, and Staff.",
        "Poka-Yoke error proofing guaranteeing zero double bed allocations and curfew locks.",
        "Asynchronous FastAPI backend with MySQL 8.0 delivering sub-10ms query execution.",
        "Full Total Quality Management (TQM) integration with Kaizen grievance workflows."
    ], top=3.1)

    # ============================================================
    # SLIDE 2: Problem Statement
    # ============================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2)
    add_slide_header(s2, "Problem Statement & Quality Gaps")
    add_bullet_content(s2, [
        "Manual Paper Logbooks: Cause unverified exits, long roll-call queues, and zero real-time visibility during curfew.",
        "Duplicate Bed Allocations: Absence of atomic locking leads to double-booking beds and room capacity conflicts.",
        "Zero Parent Visibility: Guardians lack remote access to verify daily attendance, gate passes, or fee dues.",
        "Untracked Maintenance Delays: Facility grievances on loose paper get lost with no SLA tracking or technician accountability.",
        "Mess Inventory Leakage: Pantry commodities suffer undocumented stock shrinkage without threshold alerts."
    ])

    # ============================================================
    # SLIDE 3: Core Stakeholder Ecosystem (RBAC)
    # ============================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3)
    add_slide_header(s3, "Stakeholder Ecosystem & Access Control")
    add_bullet_content(s3, [
        "Campus Administrator: Full oversight for user credentials, hostel blocks, policy configs, and audit logs.",
        "Hostel Warden: Roll-call attendance, atomic bed allocations, outpass approvals, and mess inventory.",
        "Student Resident: Bed assignment inspection, gate pass requests, maintenance ticketing, and fee dues.",
        "Parent / Guardian: Remote ward telemetry showing live campus presence (Checked-In/Out), leaves, and dues.",
        "Operational Staff: Security gate station for pass verification and maintenance technician dispatch."
    ])

    # ============================================================
    # SLIDE 4: TQM Implementation
    # ============================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4)
    add_slide_header(s4, "Total Quality Management (TQM)")
    add_bullet_content(s4, [
        "Poka-Yoke (Mistake-Proofing): Database constraints enforce single-bed invariants and gate curfew locks.",
        "Customer & Stakeholder Focus: Role-tailored dashboards eliminate clutter; 4 color themes ensure high usability (Goal Q03).",
        "Kaizen (Continuous Improvement): Closed-loop maintenance ticketing (Open → In Progress → Resolved → Closed).",
        "Technician Routing: Workorders dispatched by trade skill (Electrician, Plumber, Carpenter, Housekeeping).",
        "Process Control & Latency SLA: Sub-10ms query execution achieved via 25+ composite B-Tree indexes."
    ])

    # ============================================================
    # SLIDE 5: SRS (Software Requirements Specification)
    # ============================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5)
    add_slide_header(s5, "Software Requirements Specification")
    add_bullet_content(s5, [
        "Individual Bed Hierarchy: Hostel → Block → Floor → Room → Bed Slot with capacity constraints.",
        "Formal Gate Pass Workflow: Automated pass request, warden approval, unique pass code, and exit/entry logging.",
        "Digital Roll-Call Attendance: Daily student attendance recording with automated monthly summary percentages.",
        "Sub-10ms Transactional SLA: High-concurrency async endpoints responding well under 10ms target.",
        "Data Security & ACID Integrity: JWT authentication, cryptographic password hashing, and horizontal isolation."
    ])

    # ============================================================
    # SLIDE 6: System Architecture
    # ============================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6)
    add_slide_header(s6, "High-Performance System Architecture")
    add_bullet_content(s6, [
        "Tier 1 (Client Presentation): React 19 + TypeScript Single Page Application built with Vite.",
        "Tier 2 (API Gateway & Security): FastAPI ASGI framework with 14 modular REST API controllers.",
        "Tier 3 (Authentication & Interceptors): Cryptographic JWT bearer tokens and least-privilege RBAC guards.",
        "Tier 4 (Business Logic & Poka-Yoke): Invariant validation engine preventing capacity breaches and curfew violations.",
        "Tier 5 (Database Storage Engine): MySQL 8.0 relational database with SQLAlchemy ORM connection pooling."
    ])

    # ============================================================
    # SLIDE 7: ER Diagram & Relational Schema
    # ============================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7)
    add_slide_header(s7, "Entity-Relationship (ER) Architecture")
    add_bullet_content(s7, [
        "Third Normal Form (3NF): 23+ normalized relational tables eliminating redundancy and update anomalies.",
        "Core Physical Entities: rooms (capacity, type) and room_allocations (student_id, room_id, bed_number).",
        "Curfew & Security: gate_passes (pass_number, departure_time, expected_return, actual_return, is_late).",
        "Facility Operations: issue_requests (category, priority, assigned_staff_id, target_deadline, status).",
        "Poka-Yoke Constraints: Composite UNIQUE (room_id, bed_number, status='active') guarantees zero duplicate beds."
    ])

    # ============================================================
    # SLIDE 8: Core Operational Workflows (CRUD)
    # ============================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_bg(s8)
    add_slide_header(s8, "Core Operational Workflows & CRUD")
    add_bullet_content(s8, [
        "Bed Allocation: Warden inspects interactive Bed Grid → Auto slot selection → Atomic reservation → 1-Click Vacate.",
        "Gate Pass Curfew: Student requests pass → Warden approves (GP-YYYYMMDD-XXXX) → Guard logs exit → Auto late flag on return.",
        "Maintenance Workorder: Student files defect → Warden assigns technician & deadline → Repair executed → Resolved.",
        "Daily Roll-Call: Warden marks daily student attendance → Real-time monthly percentages and absentee lists generated.",
        "Pantry Inventory: Warden updates pantry stock levels → Minimum threshold triggers automated replenishment warnings."
    ])

    # ============================================================
    # SLIDE 9: Operational Verification & Results
    # ============================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_bg(s9)
    add_slide_header(s9, "Operational Verification & Results")
    add_bullet_content(s9, [
        "100% Automated Test Suite Passing: Unit and integration tests verify auth, RBAC routes, and allocation invariants.",
        "52 Atomic Git Commits: Maintained on GitHub repository (himanshi-19rawat/Hostel-Management-System).",
        "Sub-10ms Response Time: Live database queries executed under 10ms with zero lock contention.",
        "Zero Double Bed Allocations: Transactional ACID locks successfully eliminate duplicate bed booking collisions.",
        "Live Production Data Verified: Operational on MySQL with active Admin, Warden, Student, Parent, and Staff accounts."
    ])

    out_file = "Hostel_Management_System_Presentation.pptx"
    prs.save(out_file)
    print(f"9-Slide Presentation successfully generated: {os.path.abspath(out_file)}")

if __name__ == "__main__":
    build_9_slide_deck()
