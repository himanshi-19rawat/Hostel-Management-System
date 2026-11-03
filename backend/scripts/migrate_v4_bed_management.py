import pymysql
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.config import settings

def run_migration():
    print(f"Connecting to MySQL '{settings.DB_NAME}' at {settings.DB_HOST}:{settings.DB_PORT}...")
    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

    with conn.cursor() as cur:
        # 1. Update rooms table
        cur.execute("DESCRIBE rooms")
        room_cols = [r["Field"] for r in cur.fetchall()]
        if "hostel_name" not in room_cols:
            cur.execute("ALTER TABLE rooms ADD COLUMN hostel_name VARCHAR(100) NOT NULL DEFAULT 'Main Campus Hostel' AFTER id")
            print("Added 'hostel_name' to rooms table.")
        else:
            print("'hostel_name' already exists in rooms.")

        # 2. Update room_allocations table
        cur.execute("DESCRIBE room_allocations")
        alloc_cols = [r["Field"] for r in cur.fetchall()]
        if "bed_number" not in alloc_cols:
            cur.execute("ALTER TABLE room_allocations ADD COLUMN bed_number VARCHAR(20) NOT NULL DEFAULT 'Bed 1' AFTER room_id")
            print("Added 'bed_number' to room_allocations table.")
        else:
            print("'bed_number' already exists in room_allocations.")

        # Assign unique bed numbers to existing allocations if needed
        cur.execute("SELECT id, room_id, status FROM room_allocations WHERE bed_number = 'Bed 1' ORDER BY id ASC")
        rows = cur.fetchall()
        room_bed_counter = {}
        for row in rows:
            rid = row["room_id"]
            room_bed_counter[rid] = room_bed_counter.get(rid, 0) + 1
            b_num = f"Bed {room_bed_counter[rid]}"
            cur.execute("UPDATE room_allocations SET bed_number = %s WHERE id = %s", (b_num, row["id"]))

        conn.commit()
        print("Migration v4 (Individual Bed Management) SUCCESSFUL!")

    conn.close()

if __name__ == "__main__":
    run_migration()
