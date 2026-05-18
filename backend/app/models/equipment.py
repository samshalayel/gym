from sqlalchemy import Column, Integer, String, Date, DateTime, func
from app.database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
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
