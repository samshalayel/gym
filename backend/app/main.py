from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal, Base
from app.models.__all_models import *
from app.services.seed import seed_data
from sqlalchemy import inspect, text
from app.routes import (
    auth,
    members,
    plans,
    subscriptions,
    offers,
    equipment,
    staff,
    appointments,
    workouts,
    nutrition,
    dashboard,
    member_portal,
    attendance,
    member_progress,
    expenses,
    sync,
    schedule,
)
import os

app = FastAPI(title="Gym Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(members.router)
app.include_router(plans.router)
app.include_router(subscriptions.router)
app.include_router(offers.router)
app.include_router(equipment.router)
app.include_router(staff.router)
app.include_router(appointments.router)
app.include_router(workouts.router)
app.include_router(nutrition.router)
app.include_router(dashboard.router)
app.include_router(member_portal.router)
app.include_router(attendance.router)
app.include_router(member_progress.router)
app.include_router(expenses.router)
app.include_router(sync.router)
app.include_router(schedule.router)

import sys


def _resolve_frontend_dist():
    # When packaged by PyInstaller, the React build is bundled under _MEIPASS/frontend_dist.
    if getattr(sys, "frozen", False):
        bundled = os.path.join(getattr(sys, "_MEIPASS", ""), "frontend_dist")
        if os.path.isdir(bundled):
            return bundled
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))


frontend_dist = _resolve_frontend_dist()
assets_dir = os.path.join(frontend_dist, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    # Serve exact file if it exists (favicon, manifest, etc.)
    candidate = os.path.join(frontend_dist, full_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)
    # SPA catch-all → always return index.html
    index = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Not Found")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_runtime_columns()
    db = SessionLocal()
    try:
        seed_data(db)
        ensure_cashier_user(db)
    finally:
        db.close()


def ensure_cashier_user(db):
    from app.models.user import User as UserModel
    from app.auth.auth import get_password_hash
    if not db.query(UserModel).filter(UserModel.username == "cashier").first():
        cashier = UserModel(
            username="cashier",
            hashed_password=get_password_hash("cashier123"),
            email="cashier@gym.com",
            role="cashier",
        )
        db.add(cashier)
        db.commit()


def ensure_runtime_columns():
    inspector = inspect(engine)
    with engine.begin() as conn:
        if inspector.has_table("attendance"):
            attendance_columns = {col["name"] for col in inspector.get_columns("attendance")}
            if "duration_hours" not in attendance_columns:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN duration_hours FLOAT NOT NULL DEFAULT 1"))
        if inspector.has_table("membership_plans"):
            plan_columns = {col["name"] for col in inspector.get_columns("membership_plans")}
            if "session_count" not in plan_columns:
                conn.execute(text("ALTER TABLE membership_plans ADD COLUMN session_count INTEGER"))
        if inspector.has_table("members"):
            member_columns = {col["name"] for col in inspector.get_columns("members")}
            if "birth_date" not in member_columns:
                conn.execute(text("ALTER TABLE members ADD COLUMN birth_date DATE"))
            if "notes" not in member_columns:
                conn.execute(text("ALTER TABLE members ADD COLUMN notes TEXT"))
            if "member_code" not in member_columns:
                conn.execute(text("ALTER TABLE members ADD COLUMN member_code VARCHAR(10)"))
                rows = conn.execute(text("SELECT id FROM members ORDER BY id")).fetchall()
                for idx, row in enumerate(rows, start=10001):
                    conn.execute(text(f"UPDATE members SET member_code = '{idx}' WHERE id = {row[0]}"))
        if inspector.has_table("subscriptions"):
            sub_columns = {col["name"] for col in inspector.get_columns("subscriptions")}
            if "session_count" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN session_count INTEGER"))
            if "payment_method" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN payment_method VARCHAR(50)"))
            if "payment_account" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN payment_account VARCHAR(100)"))
            if "payment_account_name" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN payment_account_name VARCHAR(100)"))
            if "training_days" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN training_days VARCHAR(30) DEFAULT 'all'"))
            if "time_slot" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN time_slot VARCHAR(10)"))
            if "training_type" not in sub_columns:
                conn.execute(text("ALTER TABLE subscriptions ADD COLUMN training_type VARCHAR(20)"))
        if inspector.has_table("equipment"):
            equipment_columns = {col["name"] for col in inspector.get_columns("equipment")}
            if "equipment_code" not in equipment_columns:
                conn.execute(text("ALTER TABLE equipment ADD COLUMN equipment_code VARCHAR(50)"))

