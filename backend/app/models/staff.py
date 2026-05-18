from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(100), unique=True)
    role = Column(String(50), default="trainer")
    specialization = Column(String(100))
    is_active = Column(String(5), default="true")
    created_at = Column(DateTime, server_default=func.now())
