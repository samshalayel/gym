from sqlalchemy import Column, Integer, String, Float, Date, Text, DateTime, func
from app.database import Base


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    discount_percent = Column(Float, default=0)
    discount_fixed = Column(Float, default=0)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(String(5), default="true")
    created_at = Column(DateTime, server_default=func.now())
