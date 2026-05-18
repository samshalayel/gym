from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    email = Column(String(100))
    role = Column(String(20), default="admin")
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True, unique=True)
    is_active = Column(String(5), default="true")
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="user")
