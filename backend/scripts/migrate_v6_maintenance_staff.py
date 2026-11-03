import sys
import os
import pymysql

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.core.config import settings

def run_migration():
    print(f"Connecting to MySQL database {settings.DB_NAME}...")
    conn = pymysql.connect(
        host=settings.DB_HOST,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        port=settings.DB_PORT,
        database=settings.DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    try:
        with conn.cursor() as cursor:
            # 1. Create staff_profiles
            print("Creating staff_profiles table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `staff_profiles` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT NOT NULL UNIQUE,
                    `employee_id` VARCHAR(50) UNIQUE NULL,
                    `full_name` VARCHAR(150) NOT NULL,
                    `designation` VARCHAR(100) NOT NULL DEFAULT 'General Staff',
                    `phone` VARCHAR(50) NULL,
                    `assigned_block` VARCHAR(50) NULL,
                    `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
                    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """)

            # 2. Check and add columns to issue_requests
            cursor.execute("DESCRIBE issue_requests;")
            existing_cols = {row['Field'] for row in cursor.fetchall()}

            if 'assigned_staff_id' not in existing_cols:
                print("Adding assigned_staff_id to issue_requests...")
                cursor.execute("""
                    ALTER TABLE `issue_requests` 
                    ADD COLUMN `assigned_staff_id` INT NULL AFTER `status`,
                    ADD CONSTRAINT `fk_issues_staff` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
                """)

            if 'target_deadline' not in existing_cols:
                print("Adding target_deadline to issue_requests...")
                cursor.execute("""
                    ALTER TABLE `issue_requests` 
                    ADD COLUMN `target_deadline` DATE NULL AFTER `assigned_staff_id`;
                """)

            if 'resolved_at' not in existing_cols:
                print("Adding resolved_at to issue_requests...")
                cursor.execute("""
                    ALTER TABLE `issue_requests` 
                    ADD COLUMN `resolved_at` DATETIME NULL AFTER `target_deadline`;
                """)

            # 3. Seed profile for staff@gmail.com if exists
            cursor.execute("SELECT id, email FROM users WHERE role = 'staff' LIMIT 1;")
            staff_user = cursor.fetchone()
            if staff_user:
                cursor.execute("SELECT id FROM staff_profiles WHERE user_id = %s;", (staff_user['id'],))
                if not cursor.fetchone():
                    print(f"Creating staff profile for {staff_user['email']}...")
                    cursor.execute("""
                        INSERT INTO staff_profiles (user_id, employee_id, full_name, designation, phone, assigned_block, is_available)
                        VALUES (%s, 'EMP-1001', 'Chief Maintenance Technician', 'Chief Maintenance Technician', '+91 98765 00001', 'Block A & B', 1);
                    """, (staff_user['id'],))

            conn.commit()
            print("Maintenance & Staff Migration completed successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
