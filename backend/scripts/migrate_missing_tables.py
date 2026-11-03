import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import engine
from sqlalchemy import text, inspect

def run_migration():
    insp = inspect(engine)

    with engine.begin() as conn:
        # 1. student_requests
        if not insp.has_table('student_requests'):
            print('Creating table student_requests...')
            conn.execute(text("""
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
            """))
            print('Created student_requests successfully.')
        else:
            print('student_requests already exists.')

        # 2. mess_inventory
        cols = [c['name'] for c in insp.get_columns('mess_inventory')]
        print('mess_inventory existing columns:', cols)

        if 'unit_price' not in cols:
            print('Adding unit_price column to mess_inventory...')
            conn.execute(text('ALTER TABLE mess_inventory ADD COLUMN unit_price DECIMAL(10,2) NULL AFTER min_threshold'))

        if 'updated_by' not in cols:
            print('Adding updated_by column to mess_inventory...')
            conn.execute(text('ALTER TABLE mess_inventory ADD COLUMN updated_by INT(11) NULL AFTER notes'))
            try:
                conn.execute(text('ALTER TABLE mess_inventory ADD CONSTRAINT fk_inventory_updater FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL'))
            except Exception as ex:
                print('Note on fk_inventory_updater constraint:', ex)
            if 'last_updated_by' in cols:
                conn.execute(text('UPDATE mess_inventory SET updated_by = last_updated_by WHERE updated_by IS NULL'))
                conn.execute(text('ALTER TABLE mess_inventory MODIFY COLUMN last_updated_by INT(11) NULL'))

        if 'status' in cols:
            print('Ensuring status column is nullable with default in_stock...')
            conn.execute(text("ALTER TABLE mess_inventory MODIFY COLUMN status ENUM('in_stock','low_stock','out_of_stock') NULL DEFAULT 'in_stock'"))

    print('Migration completed successfully.')

if __name__ == '__main__':
    run_migration()
