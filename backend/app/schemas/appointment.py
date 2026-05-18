from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time


class AppointmentBase(BaseModel):
    member_id: int
    trainer_id: Optional[int] = None
    date: date
    time: time
    duration: Optional[int] = 60
    type: Optional[str] = "personal_training"
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    trainer_id: Optional[int] = None
    date: Optional[date] = None
    time: Optional[time] = None
    duration: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
