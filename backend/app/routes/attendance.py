from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.attendance import (
    create_attendance,
    get_attendance,
    get_today_attendance_for_member,
)
from app.crud.member import get_member
from app.database import get_db
from app.schemas.attendance import AttendanceCreate

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def serialize_attendance(attendance, member):
    return {
        "id": attendance.id,
        "member_id": attendance.member_id,
        "member_name": member.name,
        "member_phone": member.phone,
        "member_status": member.status,
        "checked_in_at": attendance.checked_in_at,
        "note": attendance.note,
    }


@router.get("")
def list_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    attendance_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    total_count, rows = get_attendance(
        db,
        skip=skip,
        limit=limit,
        search=search,
        attendance_date=attendance_date,
    )
    items = [serialize_attendance(attendance, member) for attendance, member in rows]
    return {"total": len(items), "total_count": total_count, "items": items}


@router.post("", status_code=201)
def create_attendance_endpoint(data: AttendanceCreate, db: Session = Depends(get_db)):
    member = get_member(db, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    existing = get_today_attendance_for_member(db, data.member_id)
    if existing:
        raise HTTPException(status_code=409, detail="Member already checked in today")
    attendance = create_attendance(db, data)
    return serialize_attendance(attendance, member)
