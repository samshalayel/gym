from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from app.database import Base
import enum


class MemberStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    frozen = "frozen"
    canceled = "canceled"


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    gender = Column(String(10))
    age = Column(Integer)
    address = Column(String(255))
    emergency_contact = Column(String(100))
    emergency_phone = Column(String(20))
    status = Column(String(20), default=MemberStatus.active.value)
    photo = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
