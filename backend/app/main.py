from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal, Base
from app.models.__all_models import *
from app.services.seed import seed_data
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

frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Gym Management System API", "version": "1.0.0"}
