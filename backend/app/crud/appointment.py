from sqlalchemy.orm import Session
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from datetime import date


def get_appointments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Appointment).offset(skip).limit(limit).all()


def get_appointment(db: Session, app_id: int):
    return db.query(Appointment).filter(Appointment.id == app_id).first()


def get_member_appointments(db: Session, member_id: int):
    return db.query(Appointment).filter(Appointment.member_id == member_id).all()


def get_today_appointments(db: Session):
    return db.query(Appointment).filter(Appointment.date == date.today()).all()


def get_today_appointments_count(db: Session):
    return db.query(Appointment).filter(Appointment.date == date.today()).count()


def create_appointment(db: Session, data: AppointmentCreate):
    appt = Appointment(**data.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def update_appointment(db: Session, app_id: int, data: AppointmentUpdate):
    appt = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not appt:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(appt, key, value)
    db.commit()
    db.refresh(appt)
    return appt


def delete_appointment(db: Session, app_id: int):
    appt = db.query(Appointment).filter(Appointment.id == app_id).first()
    if appt:
        db.delete(appt)
        db.commit()
        return True
    return False
