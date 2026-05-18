from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class SubscriptionBase(BaseModel):
    member_id: int
    plan_id: int
    offer_id: Optional[int] = None
    start_date: date
    end_date: date
    amount_paid: Optional[float] = 0
    discount_amount: Optional[float] = 0
    payment_status: Optional[str] = "unpaid"
    renewal_status: Optional[str] = "pending"
    notes: Optional[str] = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    offer_id: Optional[int] = None
    end_date: Optional[date] = None
    amount_paid: Optional[float] = None
    discount_amount: Optional[float] = None
    payment_status: Optional[str] = None
    renewal_status: Optional[str] = None
    notes: Optional[str] = None


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
