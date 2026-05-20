from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ExpenseBase(BaseModel):
    name: str
    category: str
    amount: float
    paid_by: str
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    paid_by: Optional[str] = None
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    expense_date: date
    created_at: datetime

    class Config:
        from_attributes = True
