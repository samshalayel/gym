from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.member import Member
from app.schemas.attendance import AttendanceCreate


def get_attendance(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    attendance_date: date = None,
):
    query = db.query(Attendance, Member).join(Member, Attendance.member_id == Member.id)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
        )
    if attendance_date:
        query = query.filter(func.date(Attendance.checked_in_at) == attendance_date.isoformat())
    total = query.count()
    rows = (
        query.order_by(Attendance.checked_in_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return total, rows


def get_today_attendance_for_member(db: Session, member_id: int):
    today = date.today().isoformat()
    return (
        db.query(Attendance)
        .filter(
            Attendance.member_id == member_id,
            func.date(Attendance.checked_in_at) == today,
        )
        .first()
    )


def create_attendance(db: Session, data: AttendanceCreate):
    attendance = Attendance(**data.model_dump())
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance
