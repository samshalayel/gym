from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel


class StaffAttendanceBase(BaseModel):
    attendance_date: Optional[date] = None
    check_in: time
    check_out: Optional[time] = None
    notes: Optional[str] = None


class StaffAttendanceCreate(StaffAttendanceBase):
    pass


class StaffAttendanceUpdate(BaseModel):
    attendance_date: Optional[date] = None
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    notes: Optional[str] = None


class StaffAttendanceResponse(StaffAttendanceBase):
    id: int
    staff_id: int
    created_at: datetime

    class Config:
        from_attributes = True
