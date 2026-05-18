from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StaffBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = "trainer"
    specialization: Optional[str] = None
    is_active: Optional[str] = "true"


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[str] = None
    is_active: Optional[str] = None


class StaffResponse(StaffBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
