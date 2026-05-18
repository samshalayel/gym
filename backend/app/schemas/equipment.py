from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class EquipmentBase(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: Optional[int] = 1
    condition: Optional[str] = "good"
    maintenance_status: Optional[str] = "ok"
    last_maintenance: Optional[date] = None
    next_maintenance: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    maintenance_status: Optional[str] = None
    last_maintenance: Optional[date] = None
    next_maintenance: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EquipmentResponse(EquipmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
