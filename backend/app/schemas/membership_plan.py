from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MembershipPlanBase(BaseModel):
    name: str
    duration_months: int
    price: float
    session_count: Optional[int] = None
    description: Optional[str] = None


class MembershipPlanCreate(MembershipPlanBase):
    pass


class MembershipPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_months: Optional[int] = None
    price: Optional[float] = None
    session_count: Optional[int] = None
    description: Optional[str] = None


class MembershipPlanResponse(MembershipPlanBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
