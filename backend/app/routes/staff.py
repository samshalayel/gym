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
