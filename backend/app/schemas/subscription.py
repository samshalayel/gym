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
    session_count: Optional[int] = None
    payment_method: Optional[str] = None
    payment_account: Optional[str] = None
    payment_account_name: Optional[str] = None
    payment_status: Optional[str] = "unpaid"
    renewal_status: Optional[str] = "pending"
    training_days: Optional[str] = "all"
    time_slot: Optional[str] = None
    training_type: Optional[str] = None
    notes: Optional[str] = None


class SubscriptionCreate(SubscriptionBase):
    # Date the money was actually collected (defaults to today in the route).
    # Transient: stripped before building the Subscription model row.
    collection_date: Optional[date] = None


class SubscriptionLifecycleRequest(BaseModel):
    member_id: int
    plan_id: int
    offer_id: Optional[int] = None
    start_date: Optional[date] = None
    collection_date: Optional[date] = None
    amount_paid: Optional[float] = 0
    discount_amount: Optional[float] = 0
    session_count: Optional[int] = None
    payment_method: Optional[str] = None
    payment_account: Optional[str] = None
    payment_account_name: Optional[str] = None
    payment_status: Optional[str] = "unpaid"
    training_days: Optional[str] = "all"
    time_slot: Optional[str] = None
    training_type: Optional[str] = None
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    offer_id: Optional[int] = None
    end_date: Optional[date] = None
    amount_paid: Optional[float] = None
    discount_amount: Optional[float] = None
    session_count: Optional[int] = None
    payment_method: Optional[str] = None
    payment_account: Optional[str] = None
    payment_account_name: Optional[str] = None
    payment_status: Optional[str] = None
    renewal_status: Optional[str] = None
    training_days: Optional[str] = None
    time_slot: Optional[str] = None
    training_type: Optional[str] = None
    notes: Optional[str] = None


class FreezeRequest(BaseModel):
    freeze: bool  # True = freeze, False = unfreeze


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentCollectRequest(BaseModel):
    amount: float
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    payment_account: Optional[str] = None
    notes: Optional[str] = None
