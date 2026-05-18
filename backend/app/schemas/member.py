from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class MemberBase(BaseModel):
    name: str
    phone: str
    email: str
    gender: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    photo: Optional[str] = None


class MemberCreate(MemberBase):
    status: Optional[str] = "active"


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    status: Optional[str] = None
    photo: Optional[str] = None


class MemberResponse(MemberBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    total: int
    items: list[MemberResponse]
