from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class OfferBase(BaseModel):
    name: str
    description: Optional[str] = None
    discount_percent: Optional[float] = 0
    discount_fixed: Optional[float] = 0
    start_date: date
    end_date: date
    is_active: Optional[str] = "true"


class OfferCreate(OfferBase):
    pass


class OfferUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_fixed: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[str] = None


class OfferResponse(OfferBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
