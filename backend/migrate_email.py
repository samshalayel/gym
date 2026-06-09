"""
One-time migration: make the email column on members table nullable and non-unique.
Run from the backend directory:  python migrate_email.py
"""
import sqlite3, os, sys

DB_PATH = os.path.join(os.path.dirname(__file__), "gym.db")

if not os.path.exists(DB_PATH):
    sys.exit(f"Database not found at {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

cur.execute("PRAGMA table_info(members)")
cols = cur.fetchall()
print("Current schema:", [(c[1], c[2], c[3]) for c in cols])

cur.executescript("""
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    CREATE TABLE members_new (
        id                INTEGER  PRIMARY KEY AUTOINCREMENT,
        name              VARCHAR(100) NOT NULL,
        phone             VARCHAR(20)  NOT NULL,
        email             VARCHAR(100),
        gender            VARCHAR(10),
        age               INTEGER,
        birth_date        DATE,
        address           VARCHAR(255),
        emergency_contact VARCHAR(100),
        emergency_phone   VARCHAR(20),
        status            VARCHAR(20) DEFAULT 'active',
        photo             VARCHAR(255),
        notes             TEXT,
        created_at        DATETIME DEFAULT (CURRENT_TIMESTAMP),
        updated_at        DATETIME DEFAULT (CURRENT_TIMESTAMP)
    );

    INSERT INTO members_new
        (id, name, phone, email, gender, age, birth_date, address,
         emergency_contact, emergency_phone, status, photo, notes,
         created_at, updated_at)
    SELECT
        id, name, phone,
        CASE WHEN TRIM(email) = '' THEN NULL ELSE email END,
        gender, age, birth_date, address,
        emergency_contact, emergency_phone, status, photo, notes,
        created_at, updated_at
    FROM members;

    DROP TABLE members;
    ALTER TABLE members_new RENAME TO members;

    COMMIT;
    PRAGMA foreign_keys = ON;
""")

conn.close()
print("Migration done — email column is now nullable and non-unique.")
