from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func

from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False, index=True)
    checked_in_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    duration_hours = Column(Float, default=1.0, nullable=False)
    note = Column(String(255))
