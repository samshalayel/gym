from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MemberProgressCreate(BaseModel):
    member_id: int
    weight_kg: Optional[float] = None
    muscle_size_cm: Optional[float] = None
    notes: Optional[str] = None


class MemberProgressUpdate(BaseModel):
    weight_kg: Optional[float] = None
    muscle_size_cm: Optional[float] = None
    notes: Optional[str] = None


class MemberProgressResponse(BaseModel):
    id: int
    member_id: int
    weight_kg: Optional[float] = None
    muscle_size_cm: Optional[float] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
