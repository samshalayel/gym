from sqlalchemy import Column, Integer, String, DateTime, Date, Time, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    duration = Column(Integer, default=60)
    type = Column(String(50), default="personal_training")
    status = Column(String(20), default="scheduled")
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="appointments")
    trainer = relationship("Staff", backref="appointments")
