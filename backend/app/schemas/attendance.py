from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class AttendanceCreate(BaseModel):
    member_id: int
    attendance_date: Optional[date] = None
    duration_hours: Optional[float] = 1.0
    confirm_off_schedule: bool = False
    force_irregular: bool = False
    note: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    member_id: int
    member_name: str
    member_phone: str
    member_status: str
    checked_in_at: datetime
    duration_hours: float
    note: Optional[str] = None


class AttendanceListResponse(BaseModel):
    total: int
    total_count: int
    items: list[AttendanceResponse]
