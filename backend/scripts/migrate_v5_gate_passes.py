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
            print("Creating `gate_passes` table if it does not exist...")
            cursor.execute("""
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
            """)
            conn.commit()
            print("Table `gate_passes` successfully created or verified!")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
