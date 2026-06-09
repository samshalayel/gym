"""
Migration: add frozen_at column to subscriptions table.
Run from backend directory: python migrate_freeze.py
"""
import sqlite3, os, sys

DB_PATH = os.path.join(os.path.dirname(__file__), "gym.db")
if not os.path.exists(DB_PATH):
    sys.exit(f"Database not found at {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(subscriptions)")
cols = [c[1] for c in cur.fetchall()]
if "frozen_at" not in cols:
    cur.execute("ALTER TABLE subscriptions ADD COLUMN frozen_at DATE")
    conn.commit()
    print("Added frozen_at column to subscriptions.")
else:
    print("frozen_at column already exists — nothing to do.")

conn.close()
