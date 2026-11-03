import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import engine
from sqlalchemy import text, inspect

def run_migration():
    insp = inspect(engine)

    with engine.begin() as conn:
        # 1. Update users.role ENUM to include 'parent' and 'staff'
        print("Updating users.role enum...")
        conn.execute(text("""
            ALTER TABLE `users` 
            MODIFY COLUMN `role` ENUM('admin', 'warden', 'student', 'parent', 'staff', 'accounts_staff') NOT NULL;
        """))
        print("Updated users.role enum successfully.")

        # 2. Create parent_student_links table
        if not insp.has_table('parent_student_links'):
            print("Creating parent_student_links table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS `parent_student_links` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `parent_user_id` INT NOT NULL,
                  `student_id` INT NOT NULL,
                  `relationship` VARCHAR(50) NOT NULL DEFAULT 'Parent',
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT `fk_ps_parent` FOREIGN KEY (`parent_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                  CONSTRAINT `fk_ps_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
                  UNIQUE KEY `uq_parent_student` (`parent_user_id`, `student_id`),
                  INDEX `idx_ps_parent` (`parent_user_id`),
                  INDEX `idx_ps_student` (`student_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """))
            print("Created parent_student_links successfully.")
        else:
            print("parent_student_links already exists.")

        # 3. Create student_activity_logs table
        if not insp.has_table('student_activity_logs'):
            print("Creating student_activity_logs table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS `student_activity_logs` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `student_id` INT NOT NULL,
                  `activity_type` ENUM('check_in', 'check_out') NOT NULL,
                  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `location` VARCHAR(100) NOT NULL DEFAULT 'Main Gate',
                  `recorded_by` INT NULL,
                  `remarks` TEXT NULL,
                  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT `fk_activity_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
                  CONSTRAINT `fk_activity_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
                  INDEX `idx_activity_student` (`student_id`),
                  INDEX `idx_activity_time` (`timestamp`),
                  INDEX `idx_activity_type` (`activity_type`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """))
            print("Created student_activity_logs successfully.")
        else:
            print("student_activity_logs already exists.")

    print("Migration v2 completed successfully.")

if __name__ == '__main__':
    run_migration()
