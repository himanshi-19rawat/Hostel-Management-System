import pymysql
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.config import settings

def run_migration():
    print(f"Connecting to MySQL database '{settings.DB_NAME}' at {settings.DB_HOST}:{settings.DB_PORT}...")
    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with conn.cursor() as cur:
        # Check existing columns in student_profiles
        cur.execute("DESCRIBE student_profiles")
        existing_cols = [row["Field"] for row in cur.fetchall()]
        print(f"Existing student_profiles columns: {existing_cols}")

        columns_to_add = [
            ("photo_url", "VARCHAR(255) NULL"),
            ("course", "VARCHAR(100) NULL DEFAULT 'Computer Science & Engineering'"),
            ("academic_year", "VARCHAR(50) NULL DEFAULT '2024-2025'"),
            ("admission_date", "DATE NULL"),
            ("hostel_joining_date", "DATE NULL"),
            ("blood_group", "VARCHAR(10) NULL DEFAULT 'O+'"),
            ("current_status", "ENUM('present_in_hostel', 'outside_hostel', 'on_approved_leave', 'gate_pass_issued', 'leave_pending_approval', 'overdue_return', 'permanently_checked_out', 'inactive_admission') NOT NULL DEFAULT 'present_in_hostel'"),
            ("emergency_info", "TEXT NULL")
        ]

        for col_name, col_def in columns_to_add:
            if col_name not in existing_cols:
                sql = f"ALTER TABLE student_profiles ADD COLUMN {col_name} {col_def}"
                print(f"Executing: {sql}")
                cur.execute(sql)
            else:
                print(f"Column '{col_name}' already exists.")

        # Update baseline data for existing profiles
        cur.execute("""
            UPDATE student_profiles
            SET admission_date = COALESCE(admission_date, '2024-08-01'),
                hostel_joining_date = COALESCE(hostel_joining_date, '2024-08-05'),
                course = COALESCE(course, 'B.Tech Computer Science'),
                academic_year = COALESCE(academic_year, '2024-2025'),
                blood_group = COALESCE(blood_group, 'B+'),
                current_status = COALESCE(current_status, 'present_in_hostel')
        """)
        conn.commit()

        # Verify updated columns
        cur.execute("DESCRIBE student_profiles")
        updated_cols = [row["Field"] for row in cur.fetchall()]
        print(f"Updated student_profiles columns ({len(updated_cols)}): {updated_cols}")
        print("Migration v3 (Student Lifecycle & Profile Fields) SUCCESSFUL!")

    conn.close()

if __name__ == "__main__":
    run_migration()
