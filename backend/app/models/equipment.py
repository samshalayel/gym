from sqlalchemy import Column, ForeignKey, Integer, String, Date, DateTime, Text, func
from app.database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    equipment_code = Column(String(50), unique=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    quantity = Column(Integer, default=1)
    condition = Column(String(50), default="good")
    maintenance_status = Column(String(50), default="ok")
    last_maintenance = Column(Date)
    next_maintenance = Column(Date)
    location = Column(String(100))
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


class EquipmentMaintenanceLog(Base):
    __tablename__ = "equipment_maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False, index=True)
    issue_date = Column(Date, server_default=func.current_date(), nullable=False)
    issue_description = Column(Text, nullable=False)
    repair_date = Column(Date, nullable=True)
    repair_description = Column(Text, nullable=True)
    cost = Column(Integer, default=0)
    handled_by = Column(String(100))
    status = Column(String(20), default="open")
    created_at = Column(DateTime, server_default=func.now())
