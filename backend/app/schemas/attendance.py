from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AttendanceCreate(BaseModel):
    member_id: int
    note: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    member_id: int
    member_name: str
    member_phone: str
    member_status: str
    checked_in_at: datetime
    note: Optional[str] = None


class AttendanceListResponse(BaseModel):
    total: int
    total_count: int
    items: list[AttendanceResponse]
