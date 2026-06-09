from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.staff import (
    get_all_staff,
    get_staff,
    get_trainers,
    create_staff,
    update_staff,
    delete_staff,
)
from app.schemas.staff import StaffCreate, StaffUpdate
from app.models.staff_attendance import StaffAttendance
from app.schemas.staff_attendance import StaffAttendanceCreate, StaffAttendanceUpdate

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.get("")
def list_staff(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_all_staff(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/trainers")
def list_trainers(db: Session = Depends(get_db)):
    items = get_trainers(db)
    return {"total": len(items), "items": items}


@router.get("/{staff_id}")
def get_staff_detail(staff_id: int, db: Session = Depends(get_db)):
    item = get_staff(db, staff_id)
    if not item:
        raise HTTPException(status_code=404, detail="Staff not found")
    return item


@router.get("/{staff_id}/attendance")
def get_staff_attendance(
    staff_id: int,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
):
    if not get_staff(db, staff_id):
        raise HTTPException(status_code=404, detail="Staff not found")
    query = db.query(StaffAttendance).filter(StaffAttendance.staff_id == staff_id)
    if start_date:
        query = query.filter(StaffAttendance.attendance_date >= start_date)
    if end_date:
        query = query.filter(StaffAttendance.attendance_date <= end_date)
    items = query.order_by(StaffAttendance.attendance_date.desc(), StaffAttendance.id.desc()).all()
    return {"total": len(items), "items": items}


@router.post("/{staff_id}/attendance", status_code=201)
def create_staff_attendance(staff_id: int, data: StaffAttendanceCreate, db: Session = Depends(get_db)):
    if not get_staff(db, staff_id):
        raise HTTPException(status_code=404, detail="Staff not found")
    payload = data.model_dump()
    item = StaffAttendance(staff_id=staff_id, **payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/attendance/{attendance_id}")
def update_staff_attendance(attendance_id: int, data: StaffAttendanceUpdate, db: Session = Depends(get_db)):
    item = db.query(StaffAttendance).filter(StaffAttendance.id == attendance_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Staff attendance not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.post("", status_code=201)
def create_staff_endpoint(data: StaffCreate, db: Session = Depends(get_db)):
    return create_staff(db, data)


@router.put("/{staff_id}")
def update_staff_endpoint(
    staff_id: int, data: StaffUpdate, db: Session = Depends(get_db)
):
    item = update_staff(db, staff_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Staff not found")
    return item


@router.delete("/{staff_id}")
def delete_staff_endpoint(staff_id: int, db: Session = Depends(get_db)):
    if not delete_staff(db, staff_id):
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}
