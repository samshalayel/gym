from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class EquipmentBase(BaseModel):
    equipment_code: Optional[str] = None
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
    equipment_code: Optional[str] = None
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


class EquipmentMaintenanceLogBase(BaseModel):
    issue_date: Optional[date] = None
    issue_description: str
    repair_date: Optional[date] = None
    repair_description: Optional[str] = None
    cost: Optional[int] = 0
    handled_by: Optional[str] = None
    status: Optional[str] = "open"


class EquipmentMaintenanceLogCreate(EquipmentMaintenanceLogBase):
    pass


class EquipmentMaintenanceLogUpdate(BaseModel):
    issue_date: Optional[date] = None
    issue_description: Optional[str] = None
    repair_date: Optional[date] = None
    repair_description: Optional[str] = None
    cost: Optional[int] = None
    handled_by: Optional[str] = None
    status: Optional[str] = None


class EquipmentMaintenanceLogResponse(EquipmentMaintenanceLogBase):
    id: int
    equipment_id: int
    created_at: datetime

    class Config:
        from_attributes = True
