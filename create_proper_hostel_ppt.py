import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_proper_deck():
    prs = Presentation()
    # 16:9 Widescreen standard: 13.333 x 7.5 inches
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Scheme matching reference PDF
    C_CANVAS = RGBColor(241, 245, 249)     # Slate 100 soft background
    C_CARD_BG = RGBColor(255, 255, 255)    # Pure White
    C_BORDER = RGBColor(226, 232, 240)     # Slate 200 border
    C_TITLE = RGBColor(15, 23, 42)         # Slate 900
    C_SUBTITLE = RGBColor(37, 99, 235)     # Vibrant Royal Blue
    C_BODY = RGBColor(51, 65, 85)          # Slate 700 readable body
    C_MUTED = RGBColor(100, 116, 139)      # Slate 500

    # Accents
    C_BLUE = RGBColor(37, 99, 235)         # Blue 600
    C_EMERALD = RGBColor(16, 185, 129)     # Emerald 500
    C_AMBER = RGBColor(245, 158, 11)       # Amber 500
    C_ROSE = RGBColor(239, 68, 68)         # Rose 500
    C_PURPLE = RGBColor(147, 51, 234)      # Purple 600
    C_NAVY = RGBColor(30, 41, 59)          # Slate 800

    def set_canvas(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_CANVAS
        bg.line.fill.background()
        return bg

    def add_top_header(slide, super_title, title_text, subtitle_text=None):
        # Super title tag
        tb_sup = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.35))
        tf_sup = tb_sup.text_frame
        tf_sup.margin_left = tf_sup.margin_top = tf_sup.margin_right = tf_sup.margin_bottom = 0
        p_sup = tf_sup.paragraphs[0]
        p_sup.text = super_title.upper()
        p_sup.font.size = Pt(11)
        p_sup.font.bold = True
        p_sup.font.color.rgb = C_SUBTITLE

        # Main Title (Heading 40pt)
        tb_main = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.733), Inches(0.75))
        tf_main = tb_main.text_frame
        tf_main.margin_left = tf_main.margin_top = tf_main.margin_right = tf_main.margin_bottom = 0
        p_main = tf_main.paragraphs[0]
        p_main.text = title_text
        p_main.font.size = Pt(36)
        p_main.font.bold = True
        p_main.font.color.rgb = C_TITLE

        # Subtitle
        if subtitle_text:
            tb_sub = slide.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(11.733), Inches(0.4))
            tf_sub = tb_sub.text_frame
            tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle_text
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = C_MUTED

    def draw_card(slide, left, top, width, height, accent_color=None, bg_color=C_CARD_BG, border_color=C_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)

        # Top colored accent stripe
        if accent_color:
            stripe = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.15), top, width - Inches(0.3), Inches(0.08))
            stripe.fill.solid()
            stripe.fill.fore_color.rgb = accent_color
            stripe.line.fill.background()
        return card

    # ============================================================
    # SLIDE 1: Title Slide (Intelligent Residential Platform)
    # ============================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_canvas(s1)

    # Master Backdrop Card
    draw_card(s1, Inches(0.8), Inches(0.6), Inches(11.733), Inches(6.3))

    # Badge Pill
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.0), Inches(3.2), Inches(0.42))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(239, 246, 255)
    badge.line.color.rgb = C_SUBTITLE
    badge.line.width = Pt(1.2)
    b_tf = badge.text_frame
    b_p = b_tf.paragraphs[0]
    b_p.text = "INTELLIGENT RESIDENTIAL PLATFORM"
    b_p.font.size = Pt(10)
    b_p.font.bold = True
    b_p.font.color.rgb = C_SUBTITLE
    b_p.alignment = PP_ALIGN.CENTER

    # Title & Subtitle
    tb1 = s1.shapes.add_textbox(Inches(1.2), Inches(1.6), Inches(10.9), Inches(1.4))
    tf1 = tb1.text_frame
    p1 = tf1.paragraphs[0]
    p1.text = "Hostel Management System"
    p1.font.size = Pt(40)
    p1.font.bold = True
    p1.font.color.rgb = C_TITLE

    p1_s = tf1.add_paragraph()
    p1_s.text = "Unified Residential Administration, Safety & Governance Platform"
    p1_s.font.size = Pt(18)
    p1_s.font.bold = True
    p1_s.font.color.rgb = C_SUBTITLE
    p1_s.space_before = Pt(6)

    # 4 Hero Feature Cards
    p1_cards = [
        (Inches(1.2), Inches(3.2), "Poka-Yoke Error Proofing",
         "Database-level constraints guarantee zero double bed allocations, curfew gate locks, and verified exit-entry validation.",
         C_BLUE),
        (Inches(6.8), Inches(3.2), "Multi-Party Stakeholder Governance",
         "Strict least-privilege RBAC with dedicated portals for Admin, Warden, Student, Parent, and Operational Staff.",
         C_EMERALD),
        (Inches(1.2), Inches(4.8), "High-Performance Architecture",
         "FastAPI asynchronous ASGI engine with MySQL 8.0 connection pool delivering sub-10ms transactional execution speed.",
         C_AMBER),
        (Inches(6.8), Inches(4.8), "Closed-Loop Quality Management",
         "Complete grievance resolution lifecycle with technician dispatch, Voice of Customer (VoC), and immutable audit logs.",
         C_PURPLE)
    ]

    for c_left, c_top, c_title, c_desc, c_acc in p1_cards:
        draw_card(s1, c_left, c_top, Inches(5.3), Inches(1.45), border_color=RGBColor(203, 213, 225))
        tb = s1.shapes.add_textbox(c_left + Inches(0.25), c_top + Inches(0.18), Inches(4.8), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = c_title
        pt.font.size = Pt(15)
        pt.font.bold = True
        pt.font.color.rgb = C_TITLE

        pd = tf.add_paragraph()
        pd.text = c_desc
        pd.font.size = Pt(11)
        pd.font.color.rgb = C_BODY
        pd.space_before = Pt(4)

    # ============================================================
    # SLIDE 2: Problem Statement & Quality Gaps
    # ============================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_canvas(s2)
    add_top_header(s2, "Operational Challenges in Student Residences",
                   "Problem Statement & Quality Gaps",
                   "Conventional hostel administration relies on manual records, causing operational risks and data errors.")

    problems = [
        (Inches(0.8), Inches(2.0), "Manual Paper Registers & Curfew Breaches",
         [
             "• Physical gate logbooks cause unverified exits and long roll-call queues.",
             "• Zero real-time visibility into students outside the campus during night curfews.",
             "• Inability to track expected vs. actual return times or overdue return emergencies."
         ], C_ROSE),
        (Inches(6.8), Inches(2.0), "Duplicate Bed Allocations & Booking Conflicts",
         [
             "• Absence of atomic database locking results in double bed assignments.",
             "• Physical room capacity (1 to 4 beds) breached without inventory control.",
             "• Billing discrepancies resulting from unrecorded student vacates and transfers."
         ], C_AMBER),
        (Inches(0.8), Inches(4.5), "Lack of Real-Time Parent Transparency",
         [
             "• Guardians have no remote mechanism to verify daily ward hostel presence.",
             "• Outpass requests and leaves approved without parent visibility or notification.",
             "• Fee dues and payment receipts communicated solely via delayed paper slips."
         ], C_BLUE),
        (Inches(6.8), Inches(4.5), "Untracked Grievance & Maintenance Delays",
         [
             "• Facility defect reports on loose slips get forgotten without SLA tracking.",
             "• Zero technician accountability or category routing (Electrician, Plumber).",
             "• Mess pantry operations suffer undocumented inventory shrinkage."
         ], C_NAVY)
    ]

    for left, top, title, points, color in problems:
        draw_card(s2, left, top, Inches(5.7), Inches(2.25), accent_color=color)
        tb = s2.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = C_TITLE

        for p in points:
            pb = tf.add_paragraph()
            pb.text = p
            pb.font.size = Pt(10.5)
            pb.font.color.rgb = C_BODY
            pb.space_before = Pt(3)

    # ============================================================
    # SLIDE 3: Core Stakeholder Ecosystem & Governance (RBAC)
    # ============================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_canvas(s3)
    add_top_header(s3, "Role-Based Access Control (RBAC)",
                   "Core Stakeholder Ecosystem & Governance",
                   "Autonomous, role-tailored dashboards ensuring least-privilege security and horizontal data isolation.")

    stakeholders = [
        ("Campus Administrator", "System Governance & Master Control",
         "Full institutional authority: User administration, hostel block creation, policy configs, database backups, audit trail inspection, and TQM quality metrics review.",
         C_BLUE, RGBColor(239, 246, 255)),
        ("Hostel Warden", "Welfare, Roll-Call & Discipline",
         "Operational hub: Daily morning/night attendance, atomic room/bed allocation, outpass and gate pass reviews, mess inventory oversight, and grievance escalation.",
         C_EMERALD, RGBColor(236, 253, 245)),
        ("Student Resident", "Personal Residence & Self-Service",
         "Resident portal: Inspect assigned bed slot, mark daily presence, request gate passes with emergency contacts, raise maintenance tickets, and check fee dues.",
         C_PURPLE, RGBColor(250, 245, 255)),
        ("Parent / Guardian", "Ward Telemetry & Family Transparency",
         "Family portal: Real-time visibility into ward's hostel check-in/out status, verified gate passes, fee payment history, and warden contact directory.",
         C_AMBER, RGBColor(255, 251, 235)),
        ("Operational Staff", "Facility Repairs & Campus Gate Security",
         "Specialized portals: Security guard quick pass verification and exit/entry logging; Maintenance technician dispatch (Electrician, Plumber, Carpenter).",
         C_NAVY, RGBColor(241, 245, 249))
    ]

    r_top = Inches(1.9)
    for role_name, subhead, desc, col, bg_pill in stakeholders:
        draw_card(s3, Inches(0.8), r_top, Inches(11.733), Inches(0.95))

        # Pill badge on left
        pill = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), r_top + Inches(0.18), Inches(2.4), Inches(0.58))
        pill.fill.solid()
        pill.fill.fore_color.rgb = bg_pill
        pill.line.color.rgb = col
        pill.line.width = Pt(1.2)
        p_tf = pill.text_frame
        p_p = p_tf.paragraphs[0]
        p_p.text = role_name
        p_p.font.size = Pt(10.5)
        p_p.font.bold = True
        p_p.font.color.rgb = col
        p_p.alignment = PP_ALIGN.CENTER

        # Text on right
        tb = s3.shapes.add_textbox(Inches(3.6), r_top + Inches(0.12), Inches(8.7), Inches(0.75))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = subhead
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = C_TITLE

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = C_BODY
        p2.space_before = Pt(2)

        r_top += Inches(1.02)

    # ============================================================
    # SLIDE 4: TQM Principles Applied in System Engineering
    # ============================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_canvas(s4)
    add_top_header(s4, "Total Quality Management (TQM) Methodology",
                   "TQM Principles Applied in System Engineering",
                   "Rigorous engineering principles ensuring zero defects, stakeholder focus, continuous improvement, and process speed.")

    tqm_quads = [
        (Inches(0.8), Inches(2.0), "Poka-Yoke (Mistake-Proofing)",
         [
             "• Single-Bed Invariant: Database UNIQUE constraints strictly prevent duplicate bed booking per room.",
             "• Curfew Gate Lock: Security cannot record student exit without verified warden gate pass.",
             "• Exit-Before-Entry Guard: Physical return cannot be stamped before exit is verified in system.",
             "• First-Login Password Lock: Mandatory password reset on first access prevents credential leaks."
         ], C_EMERALD),
        (Inches(6.8), Inches(2.0), "Customer & Stakeholder Focus",
         [
             "• Zero UI Clutter: Dashboards display only role-pertinent telemetry without administrative overload.",
             "• Dedicated Parent Portal: Remote ward location status, leave approval queues, and fee status.",
             "• Usability & Accessibility (Goal Q03): 4 accent themes (Blue, Emerald, Violet, Slate) + High-Contrast mode.",
             "• Interactive Bed Grid: Visual room layout allowing 1-click bed allocation and vacating."
         ], C_BLUE),
        (Inches(0.8), Inches(4.5), "Kaizen (Continuous Improvement)",
         [
             "• Closed-Loop Maintenance: Tickets advance: Open → In Progress → Resolved (with remarks) → Closed.",
             "• Technician Routing: Dispatched by trade skill specialization (Electrician, Plumber, Carpenter).",
             "• PDCA Quality Cycles: Plan-Do-Check-Act quality loop tracked directly in the database.",
             "• VoC & CTQ Analytics: Voice of Customer and Critical to Quality parameters logged to eliminate errors."
         ], C_AMBER),
        (Inches(6.8), Inches(4.5), "Process Control & Q03 Latency SLA",
         [
             "• Standardized SIPOC Mapping: Clear alignment of Suppliers, Inputs, Transformation, Outputs, Customers.",
             "• Sub-10ms Transactional SLA: High-concurrency async endpoints with 25+ composite B-Tree indexes.",
             "• Immutable Audit Trail: Centralized activity logging for every room change, role elevation, and gate exit.",
             "• Overdue Curfew Tracker: Automated late-return flagging when actual return breaches expected curfew."
         ], C_PURPLE)
    ]

    for left, top, title, bullets, color in tqm_quads:
        draw_card(s4, left, top, Inches(5.7), Inches(2.25), accent_color=color)
        tb = s4.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = C_TITLE

        for b in bullets:
            pb = tf.add_paragraph()
            pb.text = b
            pb.font.size = Pt(10)
            pb.font.color.rgb = C_BODY
            pb.space_before = Pt(2.5)

    # ============================================================
    # SLIDE 5: Software Requirements Specification (SRS)
    # ============================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_canvas(s5)
    add_top_header(s5, "Software Engineering Baselines (Distinct From Architecture)",
                   "Software Requirements Specification (SRS)",
                   "Comprehensive functional specifications and non-functional quality requirements defining the platform.")

    draw_card(s5, Inches(0.8), Inches(2.0), Inches(5.7), Inches(4.8), accent_color=C_BLUE)
    tb_srs_fn = s5.shapes.add_textbox(Inches(1.05), Inches(2.2), Inches(5.2), Inches(4.4))
    tf_fn = tb_srs_fn.text_frame
    tf_fn.word_wrap = True
    pt = tf_fn.paragraphs[0]
    pt.text = "Functional Requirements (Core Capabilities)"
    pt.font.size = Pt(15)
    pt.font.bold = True
    pt.font.color.rgb = C_TITLE

    fn_items = [
        "• Individual Bed Management: Hierarchy: Hostel → Block → Floor → Room → Bed Slot. Enforces single-occupancy bed invariants and transfer workflows.",
        "• Digital Gate Passes: Automated request with departure/return timestamps, unique reference codes (GP-YYYYMMDD-XXXX), QR payload, and security exit/entry stamping.",
        "• Biometric & Daily Roll-Call: Digital morning roll-call with student Present/Absent confirmation and attendance history.",
        "• Facility Maintenance SLA: Defect ticketing with skill-based technician assignment (Electrician, Plumber, Carpenter) and target completion deadlines.",
        "• Parent Transparency: Real-time ward campus status (Checked-In, Outside, On Leave) and payment history.",
        "• Mess Pantry Inventory: Tracking commodities, pantry stock deductions, minimum threshold alerts, and restocking logs."
    ]
    for it in fn_items:
        p = tf_fn.add_paragraph()
        p.text = it
        p.font.size = Pt(10)
        p.font.color.rgb = C_BODY
        p.space_before = Pt(4)

    draw_card(s5, Inches(6.8), Inches(2.0), Inches(5.7), Inches(4.8), accent_color=C_EMERALD)
    tb_srs_nfn = s5.shapes.add_textbox(Inches(7.05), Inches(2.2), Inches(5.2), Inches(4.4))
    tf_nfn = tb_srs_nfn.text_frame
    tf_nfn.word_wrap = True
    pt2 = tf_nfn.paragraphs[0]
    pt2.text = "Non-Functional Requirements (Quality Metrics)"
    pt2.font.size = Pt(15)
    pt2.font.bold = True
    pt2.font.color.rgb = C_TITLE

    nfn_items = [
        "• Quality Goal Q03 Latency (<10ms SLA): Sub-10ms transactional execution achieved via asynchronous FastAPI endpoints and targeted indexes.",
        "• Concurrency & ACID Integrity: Transactional foreign keys and unique constraints preventing race conditions during concurrent bed bookings.",
        "• Horizontal Data Isolation: Strict role validation preventing students and parents from querying cross-record resident files.",
        "• Scalability & Lightweight Footprint: Asynchronous Python ASGI service capable of serving 5,000+ residents with low memory footprint.",
        "• UI/UX Ergonomics & Accessibility: Responsive React 19 layout, 4 custom accent themes, Dark/Light modes, and High-Contrast visual toggle.",
        "• Relational Data Durability: Strict MySQL InnoDB engine with foreign keys, cascade rules, automated backups, and immutable activity logs."
    ]
    for it in nfn_items:
        p = tf_nfn.add_paragraph()
        p.text = it
        p.font.size = Pt(10)
        p.font.color.rgb = C_BODY
        p.space_before = Pt(4)

    # ============================================================
    # SLIDE 6: Multi-Tier System Architecture
    # ============================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_canvas(s6)
    add_top_header(s6, "System Architecture & Platform Data Flow",
                   "High-Performance Multi-Tier System Architecture",
                   "Four-tier asynchronous software architecture illustrating client presentation, security gateway, business logic, and database.")

    tiers = [
        ("TIER 1: CLIENT PRESENTATION", "React 19 + TypeScript + Vite SPA",
         "• Resident & Parent Portal: Responsive attendance, gate pass cards, dues & notices\n• Warden & Admin Console: Visual bed grid, leave approval queues, user administration\n• Security & Staff Station: Pass scanner & maintenance workorders",
         C_BLUE),
        ("TIER 2: API GATEWAY & SECURITY", "FastAPI Asynchronous Gateway (ASGI)",
         "• 14 Modular REST API Routers: /api/auth, /api/rooms, /api/gate-passes, /api/attendance, /api/issues, /api/activity\n• Security Interceptor: Cryptographic JWT Bearer token authentication, least-privilege RBAC guards, and CORS middleware",
         C_EMERALD),
        ("TIER 3: BUSINESS LOGIC & POKA-YOKE", "Core Operational Service Layer",
         "• Bed Allocation Engine: Invariant capacity locks, auto bed numbering\n• Curfew & Security: Pass code generator (GP-YYYYMMDD-XXXX), QR payload, curfew return monitor\n• Maintenance Dispatch: Technician skill matching & resolution logs",
         C_AMBER),
        ("TIER 4: DATABASE & STORAGE ENGINE", "MySQL 8.0 Relational Engine",
         "• 23+ Relational Tables: Normalized 3NF tables (users, student_profiles, rooms, room_allocations, gate_passes)\n• 25+ Composite B-Tree Indexes: Fast index-assisted queries\n• TQM Schema: VoC, CTQ, SIPOC, FMEA, PDCA tables",
         C_PURPLE)
    ]

    t_top = Inches(1.9)
    for badge_text, tech_text, body_text, col in tiers:
        draw_card(s6, Inches(0.8), t_top, Inches(11.733), Inches(1.15))

        # Pill on left
        pill = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), t_top + Inches(0.18), Inches(2.6), Inches(0.78))
        pill.fill.solid()
        pill.fill.fore_color.rgb = RGBColor(239, 246, 255)
        pill.line.color.rgb = col
        pill.line.width = Pt(1.2)
        p_tf = pill.text_frame
        p_p = p_tf.paragraphs[0]
        p_p.text = badge_text
        p_p.font.size = Pt(9.5)
        p_p.font.bold = True
        p_p.font.color.rgb = col
        p_p.alignment = PP_ALIGN.CENTER
        p_sub = p_tf.add_paragraph()
        p_sub.text = tech_text
        p_sub.font.size = Pt(8.5)
        p_sub.font.color.rgb = C_MUTED
        p_sub.alignment = PP_ALIGN.CENTER

        # Body text
        tb = s6.shapes.add_textbox(Inches(3.8), t_top + Inches(0.12), Inches(8.5), Inches(0.9))
        tf = tb.text_frame
        tf.word_wrap = True
        for line in body_text.split('\n'):
            p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
            p.text = line
            p.font.size = Pt(9.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(2)

        t_top += Inches(1.25)

    # ============================================================
    # SLIDE 7: Entity-Relationship (ER) Architecture
    # ============================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_canvas(s7)
    add_top_header(s7, "Relational Schema & Structural Integrity",
                   "Entity-Relationship (ER) Architecture",
                   "Third Normal Form (3NF) relational schema with primary keys (PK), foreign keys (FK), and Poka-Yoke integrity constraints.")

    tables_top = [
        ("ROOMS", C_BLUE, [
            "• [PK] id : INT",
            "• room_number : VARCHAR(20)",
            "• hostel_name : VARCHAR(100)",
            "• block : VARCHAR(50)",
            "• floor : INT",
            "• capacity : INT (1-4 beds)",
            "• status : available / full"
        ]),
        ("ROOM_ALLOCATIONS", C_EMERALD, [
            "• [PK] id : INT",
            "• [FK] student_id -> students",
            "• [FK] room_id -> rooms",
            "• bed_number : VARCHAR(20)",
            "• allocated_from : DATE",
            "• status : active / vacated",
            "• [POKA] UNIQUE(room, bed)"
        ]),
        ("GATE_PASSES", C_PURPLE, [
            "• [PK] id : INT",
            "• pass_number : VARCHAR(50)",
            "• [FK] student_id -> students",
            "• destination : VARCHAR(255)",
            "• departure_time : DATETIME",
            "• expected_return : DATETIME",
            "• [POKA] is_late (overdue flag)"
        ]),
        ("ISSUE_REQUESTS", C_ROSE, [
            "• [PK] id : INT",
            "• [FK] student_id -> students",
            "• category : electrical / plumb..",
            "• priority : low / med / high",
            "• status : open / in_prog / res",
            "• [FK] assigned_staff_id -> users",
            "• target_deadline : DATE"
        ])
    ]

    c_left = Inches(0.8)
    for t_name, t_col, t_fields in tables_top:
        draw_card(s7, c_left, Inches(2.0), Inches(2.78), Inches(2.35), accent_color=t_col)
        tb = s7.shapes.add_textbox(c_left + Inches(0.15), Inches(2.12), Inches(2.5), Inches(2.1))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = t_name
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = t_col

        for f in t_fields:
            p = tf.add_paragraph()
            p.text = f
            p.font.size = Pt(8.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(1.5)

        c_left += Inches(2.98)

    tables_bottom = [
        ("USERS & AUTH", C_BLUE, [
            "• [PK] id : INT",
            "• email : VARCHAR(150) UNIQUE",
            "• password_hash : VARCHAR(255)",
            "• role : admin, warden, student..",
            "• is_active : BOOLEAN",
            "• must_change_password"
        ]),
        ("STUDENT_PROFILES", C_EMERALD, [
            "• [PK] id : INT",
            "• [FK] user_id -> users",
            "• full_name : VARCHAR(150)",
            "• registration_no : VARCHAR(50)",
            "• course / academic_year",
            "• current_status : 8 states"
        ]),
        ("PARENT_STUDENT_LINKS", C_AMBER, [
            "• [PK] id : INT",
            "• [FK] parent_user_id -> users",
            "• [FK] student_id -> students",
            "• relationship : VARCHAR(50)",
            "• [POKA] UNIQUE(parent, student)",
            "• Dual-party verified linkage"
        ]),
        ("STUDENT_ACTIVITY_LOGS", C_NAVY, [
            "• [PK] id : INT",
            "• [FK] student_id -> students",
            "• activity_type : check_in/out",
            "• timestamp : TIMESTAMP",
            "• location : VARCHAR(150)",
            "• [FK] recorded_by -> users"
        ])
    ]

    c_left = Inches(0.8)
    for t_name, t_col, t_fields in tables_bottom:
        draw_card(s7, c_left, Inches(4.55), Inches(2.78), Inches(2.35), accent_color=t_col)
        tb = s7.shapes.add_textbox(c_left + Inches(0.15), Inches(4.67), Inches(2.5), Inches(2.1))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = t_name
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = t_col

        for f in t_fields:
            p = tf.add_paragraph()
            p.text = f
            p.font.size = Pt(8.5)
            p.font.color.rgb = C_BODY
            p.space_after = Pt(1.5)

        c_left += Inches(2.98)

    # ============================================================
    # SLIDE 8: Core Operational Workflows (CRUD)
    # ============================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_canvas(s8)
    add_top_header(s8, "Core Functionality & Process Flow",
                   "End-to-End Operational Lifecycle Workflows",
                   "Detailed event-driven process flows for Room Allocation, Gate Pass Curfew, and Maintenance.")

    workflows = [
        ("1. Bed Allocation Flow", C_BLUE, [
            "• Student Registered & Profile Activated",
            "• Warden Views Interactive Bed Grid",
            "• System Auto-assigns Available Slot",
            "• Atomic Lock Check: Room Not Full",
            "• Bed Status → Occupied, Room → Updated",
            "• 1-Click Bed Vacate Frees Slot Instantly"
        ]),
        ("2. Gate Pass Curfew Flow", C_EMERALD, [
            "• Student Submits Destination & Return Date",
            "• Warden Review Queue (PUT .../review)",
            "• System Generates GP-YYYYMMDD-XXXX + QR",
            "• Security Guard Verifies Pass Code",
            "• Exit Logged → Student Status: Outside",
            "• Return Logged → Auto-Checks Curfew SLA"
        ]),
        ("3. Maintenance Dispatch Flow", C_AMBER, [
            "• Student Reports Defect (Plumbing, etc.)",
            "• Warden Inspects Staff Directory",
            "• Assigns Technician & Sets Deadline",
            "• Technician Inspects Room & Executes Repair",
            "• Resolution Stamped with Remarks",
            "• Workorder Ticket Closed with Timestamp"
        ])
    ]

    wf_left = Inches(0.8)
    for wf_title, wf_col, wf_steps in workflows:
        draw_card(s8, wf_left, Inches(2.0), Inches(3.75), Inches(4.8), accent_color=wf_col)
        tb = s8.shapes.add_textbox(wf_left + Inches(0.2), Inches(2.2), Inches(3.35), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = wf_title
        pt.font.size = Pt(15)
        pt.font.bold = True
        pt.font.color.rgb = wf_col

        for s in wf_steps:
            p = tf.add_paragraph()
            p.text = s
            p.font.size = Pt(11)
            p.font.color.rgb = C_BODY
            p.space_before = Pt(8)

        wf_left += Inches(3.99)

    # ============================================================
    # SLIDE 9: Operational Verification & Results
    # ============================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_canvas(s9)
    add_top_header(s9, "Verification Metrics & Quality Audit",
                   "Operational Excellence & Verification Metrics",
                   "Rigorous test automation, resilience validation, and continuous quality monitoring.")

    metrics = [
        ("100% Automated Test Suite Passing",
         "52+ Git Commits & Test Coverage",
         "Comprehensive unit and integration test coverage across authentication, room allocations, gate outpasses, and Poka-Yoke input validations.",
         C_EMERALD),
        ("Sub-10ms Response Time",
         "Quality Goal Q03 Exceeded",
         "Transactional query execution running well under 10ms SLA with zero database lock contention under MySQL 8.0 connection pooling.",
         C_BLUE),
        ("Zero Double Bed Bookings",
         "Poka-Yoke Concurrency Guard",
         "Transactional ACID constraints and atomic transfers strictly eliminate simultaneous duplicate bed reservations.",
         C_AMBER),
        ("Multi-Party Security Validated",
         "Dual-Party Parent Linkage Clearance",
         "Guarantees student consent and institutional warden clearance before family access permissions are granted.",
         C_PURPLE)
    ]

    m_coords = [
        (Inches(0.8), Inches(2.0)),
        (Inches(6.8), Inches(2.0)),
        (Inches(0.8), Inches(4.5)),
        (Inches(6.8), Inches(4.5))
    ]

    for (stat_title, stat_sub, stat_desc, stat_col), (m_left, m_top) in zip(metrics, m_coords):
        draw_card(s9, m_left, m_top, Inches(5.7), Inches(2.25))

        tb = s9.shapes.add_textbox(m_left + Inches(0.3), m_top + Inches(0.2), Inches(5.1), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True

        pt = tf.paragraphs[0]
        pt.text = stat_title
        pt.font.size = Pt(20)
        pt.font.bold = True
        pt.font.color.rgb = stat_col

        ps = tf.add_paragraph()
        ps.text = stat_sub
        ps.font.size = Pt(13)
        ps.font.bold = True
        ps.font.color.rgb = C_TITLE
        ps.space_before = Pt(3)

        pd = tf.add_paragraph()
        pd.text = stat_desc
        pd.font.size = Pt(10)
        pd.font.color.rgb = C_BODY
        pd.space_before = Pt(4)

    output_path = "Hostel_Management_System_Presentation.pptx"
    prs.save(output_path)
    print(f"Proper 9-Slide Presentation successfully generated: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    create_proper_deck()
