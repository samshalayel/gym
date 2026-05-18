from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.appointment import (
    get_appointments,
    get_appointment,
    get_member_appointments,
    get_today_appointments,
    create_appointment,
    update_appointment,
    delete_appointment,
)
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.get("")
def list_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_appointments(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/today")
def today_appointments(db: Session = Depends(get_db)):
    items = get_today_appointments(db)
    return {"total": len(items), "items": items}


@router.get("/by-member/{member_id}")
def member_appointments(member_id: int, db: Session = Depends(get_db)):
    items = get_member_appointments(db, member_id)
    return {"total": len(items), "items": items}


@router.get("/{app_id}")
def get_appointment_detail(app_id: int, db: Session = Depends(get_db)):
    item = get_appointment(db, app_id)
    if not item:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return item


@router.post("", status_code=201)
def create_appointment_endpoint(data: AppointmentCreate, db: Session = Depends(get_db)):
    return create_appointment(db, data)


@router.put("/{app_id}")
def update_appointment_endpoint(
    app_id: int, data: AppointmentUpdate, db: Session = Depends(get_db)
):
    item = update_appointment(db, app_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return item


@router.delete("/{app_id}")
def delete_appointment_endpoint(app_id: int, db: Session = Depends(get_db)):
    if not delete_appointment(db, app_id):
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted successfully"}
