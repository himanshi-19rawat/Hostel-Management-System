-- ========================================================
-- Hostel Management System - Database Schema (MySQL)
-- TQM Quality Goal: Q03 - Improve Usability
-- ========================================================

CREATE DATABASE IF NOT EXISTS `hostel_management`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hostel_management`;

-- 1. Users Table (Authentication & Access Control)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'warden', 'student', 'parent', 'staff', 'accounts_staff') NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `must_change_password` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Student Profiles
CREATE TABLE IF NOT EXISTS `student_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `registration_no` VARCHAR(50) UNIQUE NULL,
  `phone` VARCHAR(20) NULL,
  `emergency_contact` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `year_of_study` INT NULL,
  `address` TEXT NULL,
  `photo_url` VARCHAR(255) NULL,
  `course` VARCHAR(100) NULL DEFAULT 'Computer Science & Engineering',
  `academic_year` VARCHAR(50) NULL DEFAULT '2024-2025',
  `admission_date` DATE NULL,
  `hostel_joining_date` DATE NULL,
  `blood_group` VARCHAR(10) NULL DEFAULT 'O+',
  `current_status` ENUM('present_in_hostel', 'outside_hostel', 'on_approved_leave', 'gate_pass_issued', 'leave_pending_approval', 'overdue_return', 'permanently_checked_out', 'inactive_admission') NOT NULL DEFAULT 'present_in_hostel',
  `emergency_info` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_number` VARCHAR(20) NOT NULL UNIQUE,
  `hostel_name` VARCHAR(100) NOT NULL DEFAULT 'Main Campus Hostel',
  `block` VARCHAR(50) NOT NULL,
  `floor` INT NOT NULL DEFAULT 1,
  `capacity` INT NOT NULL DEFAULT 1,
  `room_type` VARCHAR(50) NOT NULL DEFAULT 'Standard',
  `monthly_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('available', 'full', 'maintenance') NOT NULL DEFAULT 'available',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_rooms_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Room Allocations
CREATE TABLE IF NOT EXISTS `room_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `bed_number` VARCHAR(20) NOT NULL DEFAULT 'Bed 1',
  `allocated_from` DATE NOT NULL,
  `allocated_to` DATE NULL,
  `status` ENUM('active', 'vacated') NOT NULL DEFAULT 'active',
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_allocations_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_allocations_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT,
  INDEX `idx_allocations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Fee Records
CREATE TABLE IF NOT EXISTS `fee_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `fee_type` VARCHAR(50) NOT NULL,
  `amount_due` DECIMAL(10,2) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `status` ENUM('pending', 'partial', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  `payment_date` DATETIME NULL,
  `payment_method` VARCHAR(50) NULL,
  `receipt_no` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_fees_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  INDEX `idx_fees_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Notices
CREATE TABLE IF NOT EXISTS `notices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `author_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `target_role` VARCHAR(50) NOT NULL DEFAULT 'all',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `published_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notices_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Calendar Events & Reminders
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_by` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `event_type` ENUM('meeting', 'inspection', 'payment_deadline', 'holiday', 'maintenance', 'other') NOT NULL DEFAULT 'other',
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NULL,
  `target_role` VARCHAR(50) NOT NULL DEFAULT 'all',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_calendar_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Issue Requests & Maintenance Tickets
CREATE TABLE IF NOT EXISTS `issue_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `category` ENUM('plumbing', 'electrical', 'carpentry', 'cleanliness', 'room_change', 'other') NOT NULL DEFAULT 'other',
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'resolved', 'rejected') NOT NULL DEFAULT 'open',
  `resolution_remarks` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_issues_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  INDEX `idx_issues_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. User Usability Settings
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `theme` VARCHAR(20) NOT NULL DEFAULT 'light',
  `high_contrast` BOOLEAN NOT NULL DEFAULT FALSE,
  `font_size` VARCHAR(20) NOT NULL DEFAULT 'medium',
  `compact_tables` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Hostel Configuration Settings
CREATE TABLE IF NOT EXISTS `hostel_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hostel_name` VARCHAR(100) NOT NULL DEFAULT '',
  `contact_email` VARCHAR(100) NULL,
  `contact_phone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `rules_policy` TEXT NULL,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hostel_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Student Daily Attendance
CREATE TABLE IF NOT EXISTS `student_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('present', 'absent') NOT NULL,
  `remarks` VARCHAR(255) NULL,
  `marked_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_marker` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_student_date_attendance` (`student_id`, `date`),
  INDEX `idx_attendance_date` (`date`),
  INDEX `idx_attendance_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Student Leave & Outpass Requests
CREATE TABLE IF NOT EXISTS `student_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `request_type` ENUM('leave', 'outpass') NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `start_time` VARCHAR(20) NULL,
  `end_time` VARCHAR(20) NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `action_by` INT NULL,
  `decision_remarks` TEXT NULL,
  `action_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_requests_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requests_action_user` FOREIGN KEY (`action_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_requests_student` (`student_id`),
  INDEX `idx_requests_status` (`status`),
  INDEX `idx_requests_type` (`request_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Mess Inventory
CREATE TABLE IF NOT EXISTS `mess_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(50) NOT NULL,
  `min_threshold` DECIMAL(10,2) NULL DEFAULT 0.00,
  `unit_price` DECIMAL(10,2) NULL,
  `notes` TEXT NULL,
  `updated_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inventory_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_inventory_item` (`item_name`),
  INDEX `idx_inventory_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TQM Quality Assurance & Usability Engineering Tables
-- ========================================================

-- 11. TQM Voice of Customer (VoC) / Usability Feedback
CREATE TABLE IF NOT EXISTS `tqm_voc` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `stakeholder_type` ENUM('student', 'warden', 'staff', 'admin') NOT NULL,
  `feedback_category` VARCHAR(100) NOT NULL,
  `customer_verbatim` TEXT NOT NULL,
  `key_issue` VARCHAR(255) NOT NULL,
  `satisfaction_rating` INT NULL,
  `usability_metric` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_voc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_voc_category` (`feedback_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TQM Critical to Quality (CTQ) Parameters
CREATE TABLE IF NOT EXISTS `tqm_ctq` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `need_statement` VARCHAR(255) NOT NULL,
  `quality_driver` VARCHAR(255) NOT NULL,
  `ctq_metric` VARCHAR(255) NOT NULL,
  `target_specification` VARCHAR(255) NOT NULL,
  `lower_limit` VARCHAR(100) NULL,
  `upper_limit` VARCHAR(100) NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_ctq_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TQM SIPOC High-Level Process Maps
CREATE TABLE IF NOT EXISTS `tqm_sipoc` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `process_name` VARCHAR(150) NOT NULL,
  `supplier` TEXT NOT NULL,
  `inputs` TEXT NOT NULL,
  `process_steps` TEXT NOT NULL,
  `outputs` TEXT NOT NULL,
  `customer` TEXT NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_sipoc_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TQM Failure Mode and Effects Analysis (FMEA with RPN)
CREATE TABLE IF NOT EXISTS `tqm_fmea` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `process_step` VARCHAR(150) NOT NULL,
  `potential_failure_mode` VARCHAR(255) NOT NULL,
  `potential_effect` VARCHAR(255) NOT NULL,
  `severity` INT NOT NULL,
  `potential_cause` VARCHAR(255) NOT NULL,
  `occurrence` INT NOT NULL,
  `current_controls` VARCHAR(255) NOT NULL,
  `detection` INT NOT NULL,
  `rpn` INT NOT NULL,
  `recommended_action` TEXT NULL,
  `action_taken` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_fmea_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_fmea_rpn` (`rpn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TQM Defect Logging & Remediation Tracking
CREATE TABLE IF NOT EXISTS `tqm_defects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `defect_type` ENUM('usability', 'functional', 'data_error', 'ui_display', 'performance', 'security') NOT NULL DEFAULT 'usability',
  `severity` ENUM('critical', 'major', 'minor', 'cosmetic') NOT NULL DEFAULT 'minor',
  `reported_by` INT NOT NULL,
  `root_cause` TEXT NULL,
  `corrective_action` TEXT NULL,
  `status` ENUM('logged', 'analyzing', 'in_remediation', 'verified_closed') NOT NULL DEFAULT 'logged',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_defects_user` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_defects_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. TQM Plan-Do-Check-Act (PDCA) Continuous Improvement Cycles
CREATE TABLE IF NOT EXISTS `tqm_pdca` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cycle_name` VARCHAR(150) NOT NULL,
  `target_objective` VARCHAR(255) NOT NULL,
  `plan_stage` TEXT NOT NULL,
  `do_stage` TEXT NULL,
  `check_stage` TEXT NULL,
  `act_stage` TEXT NULL,
  `status` ENUM('plan', 'do', 'check', 'act', 'standardized') NOT NULL DEFAULT 'plan',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tqm_pdca_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_pdca_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Parent-Student Links
CREATE TABLE IF NOT EXISTS `parent_student_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_user_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `relationship` VARCHAR(50) NOT NULL DEFAULT 'Parent',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_parent_links_user` FOREIGN KEY (`parent_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_parent_links_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_parent_student` (`parent_user_id`, `student_id`),
  INDEX `idx_parent_links_parent` (`parent_user_id`),
  INDEX `idx_parent_links_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Student Activity & Gate Check-in/Check-out Logs
CREATE TABLE IF NOT EXISTS `student_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `activity_type` ENUM('check_in', 'check_out') NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `location` VARCHAR(150) NOT NULL DEFAULT 'Main Campus Gate',
  `recorded_by` INT NULL,
  `remarks` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_activity_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_recorder` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_activity_student` (`student_id`),
  INDEX `idx_activity_type` (`activity_type`),
  INDEX `idx_activity_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Gate Passes
CREATE TABLE IF NOT EXISTS `gate_passes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pass_number` VARCHAR(50) UNIQUE NULL,
  `student_id` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `departure_date` DATE NOT NULL,
  `departure_time` TIME NOT NULL,
  `expected_return_date` DATE NOT NULL,
  `expected_return_time` TIME NOT NULL,
  `emergency_contact` VARCHAR(50) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'expired', 'completed', 'overdue') NOT NULL DEFAULT 'pending',
  `approved_by` INT NULL,
  `approved_at` DATETIME NULL,
  `rejection_reason` VARCHAR(255) NULL,
  `actual_exit_time` DATETIME NULL,
  `actual_return_time` DATETIME NULL,
  `verified_by_security` INT NULL,
  `is_late` BOOLEAN NOT NULL DEFAULT FALSE,
  `qr_data` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_gatepass_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gatepass_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gatepass_security` FOREIGN KEY (`verified_by_security`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_gate_passes_status` (`status`),
  INDEX `idx_gate_passes_student` (`student_id`),
  INDEX `idx_gate_passes_pass_no` (`pass_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
