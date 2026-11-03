import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    # Color Palette matching the sample presentation
    C_BG = RGBColor(248, 250, 252)         # Slate 50
    C_CARD_BG = RGBColor(255, 255, 255)    # White
    C_BORDER = RGBColor(226, 232, 240)     # Slate 200
    C_TITLE = RGBColor(15, 23, 42)         # Slate 900
    C_SUBTITLE = RGBColor(37, 99, 235)     # Blue 600
    C_BODY = RGBColor(71, 85, 105)         # Slate 600
    C_MUTED = RGBColor(100, 116, 139)      # Slate 500
    C_BADGE_BG = RGBColor(239, 246, 255)   # Blue 50
    C_BADGE_TXT = RGBColor(29, 78, 216)    # Blue 700

    C_BLUE = RGBColor(37, 99, 235)
    C_EMERALD = RGBColor(16, 185, 129)
    C_AMBER = RGBColor(245, 158, 11)
    C_ROSE = RGBColor(239, 68, 68)
    C_PURPLE = RGBColor(147, 51, 234)

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, super_title, title, subtitle=None):
        # Super title badge
        if super_title:
            st_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.7), Inches(0.4))
            tf_st = st_box.text_frame
            tf_st.word_wrap = True
            p_st = tf_st.paragraphs[0]
            p_st.text = super_title.upper()
            p_st.font.size = Pt(10)
            p_st.font.bold = True
            p_st.font.color.rgb = C_SUBTITLE

        # Main Title
        t_top = Inches(0.75) if super_title else Inches(0.5)
        t_box = slide.shapes.add_textbox(Inches(0.8), t_top, Inches(11.7), Inches(0.65))
        tf_t = t_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(26)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TITLE

        # Subtitle
        if subtitle:
            s_box = slide.shapes.add_textbox(Inches(0.8), t_top + Inches(0.65), Inches(11.7), Inches(0.45))
            tf_s = s_box.text_frame
            tf_s.word_wrap = True
            p_s = tf_s.paragraphs[0]
            p_s.text = subtitle
            p_s.font.size = Pt(13)
            p_s.font.color.rgb = C_SUBTITLE

    def add_card(slide, left, top, width, height, title, body, border_color=C_BORDER, header_accent_color=None):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)

        if header_accent_color:
            accent_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), top, width - Inches(0.4), Inches(0.08))
            accent_bar.fill.solid()
            accent_bar.fill.fore_color.rgb = header_accent_color
            accent_bar.line.fill.background()

        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.35))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TITLE
        p_t.space_after = Pt(8)

        if isinstance(body, list):
            for item in body:
                p_b = tf.add_paragraph()
                p_b.text = item
                p_b.font.size = Pt(10.5)
                p_b.font.color.rgb = C_BODY
                p_b.space_after = Pt(4)
        else:
            p_b = tf.add_paragraph()
            p_b.text = body
            p_b.font.size = Pt(11)
            p_b.font.color.rgb = C_BODY

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Main Card
    main_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(0.8), Inches(11.533), Inches(5.9))
    main_card.fill.solid()
    main_card.fill.fore_color.rgb = C_CARD_BG
    main_card.line.color.rgb = C_BORDER
    main_card.line.width = Pt(1.5)

    # Pill badge
    pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.3), Inches(1.2), Inches(3.2), Inches(0.42))
    pill.fill.solid()
    pill.fill.fore_color.rgb = C_BADGE_BG
    pill.line.color.rgb = C_SUBTITLE
    pill.line.width = Pt(1)
    p_tf = pill.text_frame
    p_p = p_tf.paragraphs[0]
    p_p.text = "INTELLIGENT RESIDENTIAL PLATFORM"
    p_p.font.size = Pt(9.5)
    p_p.font.bold = True
    p_p.font.color.rgb = C_BADGE_TXT
    p_p.alignment = PP_ALIGN.CENTER

    # Title text
    tb_title = s1.shapes.add_textbox(Inches(1.3), Inches(1.8), Inches(10.5), Inches(1.2))
    tf_t = tb_title.text_frame
    p1 = tf_t.paragraphs[0]
    p1.text = "Hostel Management System"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = C_TITLE

    p2 = tf_t.add_paragraph()
    p2.text = "Unified Residential Administration, Safety & Governance Platform"
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = C_SUBTITLE
    p2.space_before = Pt(6)

    # 4 Key Pillars Cards inside Slide 1
    add_card(s1, Inches(1.3), Inches(3.3), Inches(5.2), Inches(1.45),
             "Poka-Yoke Error Proofing",
             "Database-level constraints guarantee zero double bed allocations, curfew gate locks, and physical exit-entry validation.",
             border_color=RGBColor(203, 213, 225))

    add_card(s1, Inches(6.8), Inches(3.3), Inches(5.2), Inches(1.45),
             "Multi-Party Stakeholder Governance",
             "Strict least-privilege RBAC separating Admin, Warden, Student, Parent, and Staff credentials with horizontal data isolation.",
             border_color=RGBColor(203, 213, 225))

    add_card(s1, Inches(1.3), Inches(4.95), Inches(5.2), Inches(1.45),
             "High-Performance Architecture",
             "FastAPI asynchronous backend with MySQL 8.0 connection pooling delivering sub-10ms transactional execution speed.",
             border_color=RGBColor(203, 213, 225))

    add_card(s1, Inches(6.8), Inches(4.95), Inches(5.2), Inches(1.45),
             "Closed-Loop Quality Management",
             "TQM usability framework (Q03), maintenance grievance lifecycle with technician dispatch, and automated audit logging.",
             border_color=RGBColor(203, 213, 225))

    # ==========================================
    # SLIDE 2: Problem Statement & Quality Gaps
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Operational Challenges in Student Residences",
               "Problem Statement & Quality Gaps",
               "Conventional hostel administration relies on manual records, causing operational risks and data errors.")

    add_card(s2, Inches(0.8), Inches(2.2), Inches(5.6), Inches(2.2),
             "Manual Paper Registers & Curfew Breaches",
             "• Physical gate logbooks cause unverified exits and long roll-call queues.\n• Zero real-time visibility into students outside the campus during night curfews.\n• Inability to track expected vs. actual return times or overdue return emergencies.",
             header_accent_color=C_ROSE)

    add_card(s2, Inches(6.8), Inches(2.2), Inches(5.6), Inches(2.2),
             "Duplicate Bed Allocations & Capacity Conflicts",
             "• Manual room booking lacks atomic database locks, causing double bed assignments.\n• Discrepancies between room capacity (1 to 4 beds) and physical room occupancy.\n• Billing disputes resulting from unrecorded student check-outs and room transfers.",
             header_accent_color=C_AMBER)

    add_card(s2, Inches(0.8), Inches(4.7), Inches(5.6), Inches(2.2),
             "Lack of Real-Time Parent Transparency",
             "• Guardians have zero remote mechanisms to verify daily ward hostel presence.\n• Outpass requests and leaves approved without parent visibility or notification.\n• Fee dues and payment receipts communicated only via paper notices.",
             header_accent_color=C_BLUE)

    add_card(s2, Inches(6.8), Inches(4.7), Inches(5.6), Inches(2.2),
             "Untracked Grievance & Maintenance Delays",
             "• Maintenance complaints (electrical, plumbing, carpentry) lost on paper slips.\n• No SLA deadlines or accountability for campus technicians and contractors.\n• Mess pantry operations suffer undocumented inventory shrinkage.",
             header_accent_color=C_TITLE)

    # ==========================================
    # SLIDE 3: Core Stakeholder Ecosystem & Governance (RBAC)
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Role-Based Access Control (RBAC)",
               "Core Stakeholder Ecosystem & Governance",
               "Autonomous, role-tailored dashboards ensuring least-privilege security and horizontal data isolation.")

    roles = [
        ("Campus Administrator", "System Governance & Master Control",
         "Full institutional oversight: User administration, hostel block creation, database backups, audit trail inspection, and TQM quality metrics review.",
         C_BLUE),
        ("Hostel Warden", "Welfare, Roll-Call & Daily Discipline",
         "Operational hub: Daily morning/night attendance, room/bed allocation, outpass and gate pass reviews, mess inventory oversight, and grievance escalation.",
         C_EMERALD),
        ("Student Resident", "Personal Residence & Self-Service",
         "Resident portal: View assigned bed slot, mark daily presence, request gate passes with emergency contacts, raise maintenance tickets, and check dues.",
         C_SUBTITLE),
        ("Parent / Guardian", "Ward Telemetry & Family Transparency",
         "Family portal: Real-time visibility into ward's hostel check-in/out status, verified gate passes, fee payment history, and warden contact directory.",
         C_AMBER),
        ("Operational Staff", "Facility Repairs & Campus Gate Security",
         "Specialized portals: Security guard quick pass verification and exit/entry logging; Maintenance technician dispatch (Electrician, Plumber, Carpenter).",
         C_TITLE)
    ]

    top_pos = Inches(2.0)
    for r_title, r_sub, r_desc, r_col in roles:
        card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_pos, Inches(11.7), Inches(0.92))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = C_BORDER

        pill = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top_pos + Inches(0.18), Inches(2.3), Inches(0.55))
        pill.fill.solid()
        pill.fill.fore_color.rgb = C_BADGE_BG
        pill.line.color.rgb = r_col
        pill.line.width = Pt(1.2)
        p_tf = pill.text_frame
        p_p = p_tf.paragraphs[0]
        p_p.text = r_title
        p_p.font.size = Pt(11)
        p_p.font.bold = True
        p_p.font.color.rgb = r_col
        p_p.alignment = PP_ALIGN.CENTER

        tb = s3.shapes.add_textbox(Inches(3.5), top_pos + Inches(0.12), Inches(8.8), Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = r_sub
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = C_TITLE

        p2 = tf.add_paragraph()
        p2.text = r_desc
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = C_BODY
        p2.space_before = Pt(2)

        top_pos += Inches(1.02)

    # ==========================================
    # SLIDE 4: TQM Principles Applied in System Engineering
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Total Quality Management (TQM) Methodology",
               "TQM Principles Applied in System Engineering",
               "Rigorous engineering principles ensuring zero defects, stakeholder focus, continuous improvement, and process speed.")

    add_card(s4, Inches(0.8), Inches(2.2), Inches(5.6), Inches(2.3),
             "Poka-Yoke (Mistake-Proofing)",
             [
                 "• Single-Bed Invariant: Database UNIQUE constraints strictly prevent duplicate bed booking per room.",
                 "• Curfew Gate Lock: Security cannot record student exit without approved warden gate pass (GP-YYYYMMDD-XXXX).",
                 "• Exit-Before-Entry Guard: Physical return cannot be recorded before exit is stamped in the system.",
                 "• First-Login Password Lock: Mandatory password change forced on newly provisioned stakeholder accounts."
             ],
             header_accent_color=C_EMERALD)

    add_card(s4, Inches(6.8), Inches(2.2), Inches(5.6), Inches(2.3),
             "Customer & Stakeholder Focus",
             [
                 "• Zero UI Clutter: Role-tailored dashboards display only relevant telemetry without cognitive overload.",
                 "• Dedicated Parent Portal: Real-time visibility into ward location status, leave history, and fees.",
                 "• Accessibility & Usability (Goal Q03): 4 accent themes (Blue, Emerald, Violet, Slate) + High-Contrast mode.",
                 "• Interactive Bed Grid: Visual room layout allowing 1-click bed allocation and vacating."
             ],
             header_accent_color=C_BLUE)

    add_card(s4, Inches(0.8), Inches(4.8), Inches(5.6), Inches(2.3),
             "Kaizen (Continuous Improvement)",
             [
                 "• Closed-Loop Maintenance: Tickets progress: Open → In Progress → Resolved (with technician remarks) → Closed.",
                 "• Technician Routing: Dispatched by skill specialization (Electrician, Plumber, Carpenter, Housekeeping).",
                 "• PDCA Quality Cycles: Plan-Do-Check-Act quality loop tracked directly in the administration database.",
                 "• FMEA & VoC Analytics: Voice of Customer and Failure Mode Analysis tracked for operational reliability."
             ],
             header_accent_color=C_AMBER)

    add_card(s4, Inches(6.8), Inches(4.8), Inches(5.6), Inches(2.3),
             "Process Control & Latency SLA",
             [
                 "• Standardized SIPOC Mapping: Clear alignment of Suppliers, Inputs, Process, Outputs, and Customers.",
                 "• Sub-10ms Transactional SLA: High-concurrency async endpoints with 25+ targeted MySQL B-Tree indexes.",
                 "• Complete Audit Trail: Chronological logging in student_activity_logs for every campus entry/exit.",
                 "• Overdue Tracking: Automated late-return flagging when actual return exceeds expected return timestamp."
             ],
             header_accent_color=C_PURPLE)

    # ==========================================
    # SLIDE 5: Software Requirements Specification (SRS)
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Software Engineering Baselines (Distinct From Architecture)",
               "Software Requirements Specification (SRS)",
               "Comprehensive functional specifications and non-functional quality requirements defining the platform.")

    add_card(s5, Inches(0.8), Inches(2.2), Inches(5.6), Inches(4.8),
             "Functional Requirements (Core Capabilities)",
             [
                 "• Individual Bed Management:",
                 "  Hostel → Block → Floor → Room → Bed Slot (Bed 1, Bed 2). Atomic allocation engine enforcing room capacity limits.",
                 "",
                 "• Gate Pass Management & Overdue Tracking:",
                 "  Student request with reason & destination → Warden review → Unique pass number (GP-YYYYMMDD-XXXX) → Security physical exit & entry logging → Auto late flag.",
                 "",
                 "• Digital Attendance & Daily Roll-Call:",
                 "  Daily student presence recording (Present/Absent) with real-time percentage and monthly summary analytics.",
                 "",
                 "• Maintenance Dispatch & Grievance SLA:",
                 "  Category-based ticket logging with priority (Low/Medium/High), staff technician assignment, deadline, and resolution verification.",
                 "",
                 "• Parent Transparency & Ward Telemetry:",
                 "  Dual-party link allowing parents remote access to ward attendance, campus presence (Checked-In / Outside / On Leave), and fee dues.",
                 "",
                 "• Mess Inventory Control:",
                 "  Tracking pantry commodities, stock levels, minimum threshold alerts, and restocking logs."
             ],
             header_accent_color=C_BLUE)

    add_card(s5, Inches(6.8), Inches(2.2), Inches(5.6), Inches(4.8),
             "Non-Functional Requirements (Quality Metrics)",
             [
                 "• Quality Goal Q03 Latency SLA (<10ms):",
                 "  Asynchronous endpoint execution delivering sub-10ms response times backed by indexed relational queries.",
                 "",
                 "• Concurrency & ACID Integrity:",
                 "  Transactional foreign keys and unique constraints preventing race conditions during concurrent bed bookings.",
                 "",
                 "• Horizontal & Vertical Data Isolation:",
                 "  Strict JWT role interceptors preventing unauthorized cross-tenant data queries between students and parents.",
                 "",
                 "• Scalability & Lightweight Footprint:",
                 "  FastAPI ASGI service capable of supporting 5,000+ residents with minimal server memory overhead.",
                 "",
                 "• UI/UX Ergonomics & Accessibility:",
                 "  Responsive React 19 layout, 4 custom accent themes, Dark/Light mode, and High-Contrast visual toggle.",
                 "",
                 "• Data Durability & Audit Trail:",
                 "  Relational schema with cascade rules, audit logging in activity logs, and zero simulated/fake telemetry."
             ],
             header_accent_color=C_EMERALD)

    # ==========================================
    # SLIDE 6: Multi-Tier System Architecture
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "System Architecture & Platform Data Flow",
               "High-Performance Multi-Tier System Architecture",
               "Four-tier asynchronous software architecture illustrating client presentation, security gateway, business logic, and database.")

    tiers = [
        ("TIER 1: CLIENT PRESENTATION", "React 19 + TypeScript + Vite SPA",
         "• Resident & Parent Portal: Responsive presence tracking, gate pass cards, fee dues\n• Warden & Admin Console: Visual bed grid, leave approval queues, user management\n• Security & Staff Station: Quick pass verification, 1-click exit/entry, maintenance workorders",
         C_BLUE),
        ("TIER 2: API GATEWAY & SECURITY", "FastAPI Asynchronous Gateway (ASGI)",
         "• 14 Modular REST API Routers: /api/auth, /api/rooms, /api/gate-passes, /api/attendance, /api/issues, etc.\n• JWT Authentication & RBAC Interceptor: Cryptographic bearer token verification and permission guards\n• CORS & Exception Middleware: Unified JSON error formatting and cross-origin security",
         C_EMERALD),
        ("TIER 3: BUSINESS LOGIC & POKA-YOKE", "Core Operational Service Layer",
         "• Bed Allocation Engine: Invariant validation, duplicate prevention, auto-slot assignment\n• Gate Pass Workflow: Unique reference generator (GP-YYYYMMDD-XXXX), QR payload, curfew late tracker\n• Maintenance Dispatch: Technician skill matching, target deadlines, resolved status transition",
         C_AMBER),
        ("TIER 4: DATABASE & STORAGE ENGINE", "MySQL 8.0 Relational Engine",
         "• 23+ Normalized Relational Tables: users, student_profiles, rooms, room_allocations, gate_passes, etc.\n• Index Optimization: 25+ composite B-Tree indexes on active allocations, status, and dates\n• Full TQM Schema: VoC, CTQ parameters, SIPOC process stages, FMEA defect logging, PDCA cycles",
         C_PURPLE)
    ]

    top_pos = Inches(2.0)
    for t_badge, t_name, t_body, t_col in tiers:
        card = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_pos, Inches(11.7), Inches(1.15))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = C_BORDER

        pill = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top_pos + Inches(0.2), Inches(2.6), Inches(0.75))
        pill.fill.solid()
        pill.fill.fore_color.rgb = C_BADGE_BG
        pill.line.color.rgb = t_col
        pill.line.width = Pt(1.2)
        p_tf = pill.text_frame
        p_p = p_tf.paragraphs[0]
        p_p.text = t_badge
        p_p.font.size = Pt(9.5)
        p_p.font.bold = True
        p_p.font.color.rgb = t_col
        p_p.alignment = PP_ALIGN.CENTER
        p_sub = p_tf.add_paragraph()
        p_sub.text = t_name
        p_sub.font.size = Pt(8.5)
        p_sub.font.color.rgb = C_MUTED
        p_sub.alignment = PP_ALIGN.CENTER

        tb = s6.shapes.add_textbox(Inches(3.8), top_pos + Inches(0.12), Inches(8.5), Inches(0.9))
        tf = tb.text_frame
        tf.word_wrap = True
        for line in t_body.split('\n'):
            p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p.text = line
            p.font.size = Pt(9.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(2)

        top_pos += Inches(1.25)

    # ==========================================
    # SLIDE 7: Entity-Relationship (ER) Architecture
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Relational Schema & Structural Integrity",
               "Entity-Relationship (ER) Architecture",
               "Third Normal Form (3NF) relational schema with primary keys (PK), foreign keys (FK), and Poka-Yoke integrity constraints.")

    tables_top = [
        ("ROOMS", C_BLUE, [
            "• [PK] id : INT",
            "• room_number : VARCHAR(20) UNIQUE",
            "• hostel_name : VARCHAR(100)",
            "• block : VARCHAR(50)",
            "• floor : INT",
            "• capacity : INT (1-4 beds)",
            "• room_type : VARCHAR(50)",
            "• status : ENUM (available, full, maint)"
        ]),
        ("ROOM_ALLOCATIONS", C_EMERALD, [
            "• [PK] id : INT",
            "• [FK] student_id -> student_profiles",
            "• [FK] room_id -> rooms",
            "• bed_number : VARCHAR(20)",
            "• allocated_from : DATE",
            "• allocated_to : DATE NULL",
            "• status : ENUM (active, vacated)",
            "• [POKA] UNIQUE (room, bed, active)"
        ]),
        ("GATE_PASSES", C_PURPLE, [
            "• [PK] id : INT",
            "• pass_number : VARCHAR(50) UNIQUE",
            "• [FK] student_id -> student_profiles",
            "• destination : VARCHAR(255)",
            "• departure_date / time : DATE/TIME",
            "• expected_return_date / time",
            "• [FK] approved_by -> users",
            "• actual_exit_time / actual_return_time",
            "• is_late : BOOLEAN (Overdue flag)"
        ]),
        ("ISSUE_REQUESTS", C_ROSE, [
            "• [PK] id : INT",
            "• [FK] student_id -> student_profiles",
            "• category : ENUM (plumbing, electrical..)",
            "• title : VARCHAR(150)",
            "• priority : ENUM (low, medium, high)",
            "• status : ENUM (open, in_prog, resolved)",
            "• [FK] assigned_staff_id -> users",
            "• target_deadline : DATE",
            "• resolution_remarks : TEXT"
        ])
    ]

    left_pos = Inches(0.8)
    for t_name, t_col, t_fields in tables_top:
        card = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(2.2), Inches(2.75), Inches(2.35))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = t_col
        card.line.width = Pt(1.5)

        tb = s7.shapes.add_textbox(left_pos + Inches(0.12), Inches(2.3), Inches(2.5), Inches(2.1))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = t_name
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = t_col
        p_t.space_after = Pt(4)

        for f in t_fields:
            p = tf.add_paragraph()
            p.text = f
            p.font.size = Pt(8.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(1.5)

        left_pos += Inches(2.98)

    tables_bottom = [
        ("USERS & AUTH", C_BLUE, [
            "• [PK] id : INT",
            "• email : VARCHAR(150) UNIQUE",
            "• password_hash : VARCHAR(255)",
            "• role : ENUM (admin, warden, student, parent, staff)",
            "• is_active : BOOLEAN",
            "• must_change_password : BOOLEAN"
        ]),
        ("STUDENT_PROFILES", C_EMERALD, [
            "• [PK] id : INT",
            "• [FK] user_id -> users",
            "• full_name : VARCHAR(150)",
            "• registration_no : VARCHAR(50)",
            "• course / academic_year",
            "• current_status : ENUM (present, outside, on_leave..)",
            "• emergency_contact : VARCHAR(50)"
        ]),
        ("PARENT_STUDENT_LINKS", C_AMBER, [
            "• [PK] id : INT",
            "• [FK] parent_user_id -> users",
            "• [FK] student_id -> student_profiles",
            "• relationship : VARCHAR(50)",
            "• [POKA] UNIQUE (parent, student)",
            "• Dual-party verified linkage"
        ]),
        ("STUDENT_ACTIVITY_LOGS", C_TITLE, [
            "• [PK] id : INT",
            "• [FK] student_id -> student_profiles",
            "• activity_type : ENUM (check_in, check_out)",
            "• timestamp : TIMESTAMP",
            "• location : VARCHAR(150)",
            "• [FK] recorded_by -> users",
            "• remarks : VARCHAR(255)"
        ])
    ]

    left_pos = Inches(0.8)
    for t_name, t_col, t_fields in tables_bottom:
        card = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(4.75), Inches(2.75), Inches(2.35))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = t_col
        card.line.width = Pt(1.5)

        tb = s7.shapes.add_textbox(left_pos + Inches(0.12), Inches(4.85), Inches(2.5), Inches(2.1))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = t_name
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = t_col
        p_t.space_after = Pt(4)

        for f in t_fields:
            p = tf.add_paragraph()
            p.text = f
            p.font.size = Pt(8.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(1.5)

        left_pos += Inches(2.98)

    # ==========================================
    # SLIDE 8: Operational Excellence & Verification Metrics
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Verification Metrics & Quality Audit",
               "Operational Excellence & Verification Metrics",
               "Rigorous test automation, resilience validation, and continuous quality monitoring.")

    add_card(s8, Inches(0.8), Inches(2.2), Inches(5.6), Inches(2.2),
             "50+ Git Commits & 100% Passing Tests",
             "• Full version control with 50+ descriptive, atomic commits on GitHub.\n• Comprehensive automated test suite validating authentication, RBAC routes, room allocation invariants, and gate passes.\n• Zero regression on legacy accounts (admin@gmail.com, warden@gmail.com).",
             header_accent_color=C_EMERALD)

    add_card(s8, Inches(6.8), Inches(2.2), Inches(5.6), Inches(2.2),
             "Sub-10ms Response Time (Goal Q03)",
             "• Asynchronous FastAPI endpoints executing queries under 10ms SLA.\n• Optimized database connection pool with pymysql & SQLAlchemy engine.\n• 25+ B-Tree composite indexes eliminating table scans on high-traffic routes.",
             header_accent_color=C_BLUE)

    add_card(s8, Inches(0.8), Inches(4.7), Inches(5.6), Inches(2.2),
             "Zero Double Bed Bookings (Poka-Yoke)",
             "• Transactional ACID isolation and unique bed constraints strictly prevent simultaneous duplicate allocations.\n• Interactive Bed Layout Grid reflects live occupancy in real time.\n• 1-Click Bed Vacate workflow instantly returns room capacity to available pool.",
             header_accent_color=C_AMBER)

    add_card(s8, Inches(6.8), Inches(4.7), Inches(5.6), Inches(2.2),
             "Multi-Party Security & Curfew Enforcement",
             "• Dedicated Security Guard Quick-Check portal with instant reference lookup.\n• Dual-party parent linkage ensuring remote family transparency.\n• Automatic curfew overdue flagging when students exceed expected return time.",
             header_accent_color=C_PURPLE)

    # ==========================================
    # SLIDE 9: Modular Folder Design & Software Structure (Review-01 & Review-02 Rubric)
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Review-01 & Review-02 Academic Rubric",
               "Modular Project Structure & Implementation Evidence",
               "Clean separation of concerns, enterprise design patterns, and comprehensive source code structure.")

    add_card(s9, Inches(0.8), Inches(2.2), Inches(5.6), Inches(4.8),
             "Backend Modular Architecture (FastAPI + SQLAlchemy)",
             [
                 "backend/",
                 "├── app/",
                 "│   ├── api/                  # 14 Modular REST Endpoints",
                 "│   │   ├── auth.py           # JWT Authentication & First Login",
                 "│   │   ├── users.py          # Admin RBAC User Administration",
                 "│   │   ├── students.py       # Student Lifecycle & Profiles",
                 "│   │   ├── rooms.py          # Rooms, Beds & Atomic Allocation",
                 "│   │   ├── gate_passes.py    # Digital Gate Passes & Security",
                 "│   │   ├── issues.py         # Maintenance & Technician Dispatch",
                 "│   │   ├── attendance.py     # Student Daily Attendance",
                 "│   │   ├── leave_outpass.py  # Student Leave Requests",
                 "│   │   ├── inventory.py      # Mess Pantry Inventory",
                 "│   │   ├── activity.py       # Activity Logs & Campus Status",
                 "│   │   ├── tqm.py            # Quality VoC, CTQ, FMEA, PDCA",
                 "│   │   └── reports.py        # Analytics & System Statistics",
                 "│   ├── core/                 # Config, Security & RBAC Guards",
                 "│   ├── database/             # SQLAlchemy Engine & Session",
                 "│   ├── models/               # 23 Normalized ORM Base Classes",
                 "│   └── schemas/              # Pydantic v2 Request/Response DTOs",
                 "└── scripts/                  # Automated Versioned Migrations"
             ],
             header_accent_color=C_BLUE)

    add_card(s9, Inches(6.8), Inches(2.2), Inches(5.6), Inches(4.8),
             "Frontend Modular Architecture (React 19 + TypeScript)",
             [
                 "frontend/",
                 "├── src/",
                 "│   ├── components/           # Reusable UI Component Library",
                 "│   │   ├── Navbar.tsx        # Top Navigation with Theme Toggle",
                 "│   │   ├── Sidebar.tsx       # Dynamic RBAC Sidebar Navigation",
                 "│   │   ├── Modal.tsx         # Accessible Dialog Modals",
                 "│   │   ├── EmptyState.tsx    # Zero-data Placeholder Cards",
                 "│   │   └── FirstLoginModal.tsx # Mandatory Password Reset",
                 "│   ├── context/              # Global State Providers",
                 "│   │   ├── AuthContext.tsx   # JWT Session & Role State",
                 "│   │   └── ThemeContext.tsx  # 4 Accent Color Themes (CSS Vars)",
                 "│   ├── pages/                # 14 Role-Dedicated Views",
                 "│   │   ├── Dashboard.tsx     # Role-Centric Telemetry KPIs",
                 "│   │   ├── Rooms.tsx         # Visual Bed Grid & Allocation",
                 "│   │   ├── SecurityGate.tsx  # Guard Portal & QR Verification",
                 "│   │   ├── Issues.tsx        # Maintenance & Technician Dispatch",
                 "│   │   ├── ActivityMap.tsx   # Real-Time Student Movement Logs",
                 "│   │   └── Settings.tsx      # High-Contrast & UI Preferences",
                 "│   ├── services/api.ts       # Typed Fetch Client with Auth",
                 "│   └── types/index.ts        # Comprehensive TypeScript Interfaces"
             ],
             header_accent_color=C_EMERALD)

    # ==========================================
    # SLIDE 10: Process Flow & Core CRUD Evidence (Review-02 Rubric)
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Core Functionality & Process Flow",
               "End-to-End Operational Lifecycle Workflows",
               "Detailed event-driven process flows for Room Allocation, Gate Pass Curfew, and Maintenance.")

    add_card(s10, Inches(0.8), Inches(2.2), Inches(3.7), Inches(4.8),
             "1. Bed Allocation Flow",
             [
                 "[ Student Registered ]",
                 "          ↓",
                 "[ Warden Views Bed Grid ]",
                 "  • Checks Room Capacity (1-4)",
                 "  • Inspects Available Bed Slots",
                 "          ↓",
                 "[ Atomic Allocation Call ]",
                 "  • POST /api/rooms/allocations",
                 "  • Invariant Check: Room Not Full",
                 "  • Invariant Check: Bed Not Taken",
                 "          ↓",
                 "[ State Committed ]",
                 "  • Bed Status → Occupied",
                 "  • Room Status → Auto Full/Avail",
                 "          ↓",
                 "[ Vacate / Transfer Action ]",
                 "  • POST /api/rooms/allocations/{id}/vacate",
                 "  • Bed Instantly Freed"
             ],
             header_accent_color=C_BLUE)

    add_card(s10, Inches(4.8), Inches(2.2), Inches(3.7), Inches(4.8),
             "2. Gate Pass Curfew Flow",
             [
                 "[ Student Submits Pass ]",
                 "  • Destination, Reason, Dates",
                 "  • Emergency Phone Number",
                 "          ↓",
                 "[ Warden Review Queue ]",
                 "  • PUT /api/gate-passes/{id}/review",
                 "  • Generates: GP-YYYYMMDD-XXXX",
                 "          ↓",
                 "[ Security Gate Verification ]",
                 "  • Guard searches reference code",
                 "  • Verifies student identity",
                 "          ↓",
                 "[ Physical Departure Logged ]",
                 "  • POST .../record-exit",
                 "  • Status → Outside Hostel",
                 "          ↓",
                 "[ Physical Return & SLA ]",
                 "  • POST .../record-entry",
                 "  • Overdue check (now > return)",
                 "  • Flags is_late if breached"
             ],
             header_accent_color=C_EMERALD)

    add_card(s10, Inches(8.8), Inches(2.2), Inches(3.7), Inches(4.8),
             "3. Maintenance Dispatch Flow",
             [
                 "[ Student Reports Defect ]",
                 "  • Electrical, Plumbing, Carpentry",
                 "  • Priority (Low, Med, High)",
                 "          ↓",
                 "[ Warden Workorder Routing ]",
                 "  • Inspects Staff Directory",
                 "  • Assigns Technician (staff_id)",
                 "  • Sets Target SLA Deadline",
                 "          ↓",
                 "[ Technician Execution ]",
                 "  • Technician logs into Portal",
                 "  • Inspects room location & defect",
                 "  • Executes physical repair",
                 "          ↓",
                 "[ Resolution Verification ]",
                 "  • PUT /api/issues/{id}/status",
                 "  • Status → Resolved",
                 "  • Submits resolution remarks",
                 "  • Records resolved_at timestamp"
             ],
             header_accent_color=C_AMBER)

    output_path = "Hostel_Management_System_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to: {os.path.abspath(output_path)}")
    return output_path

if __name__ == "__main__":
    create_deck()
