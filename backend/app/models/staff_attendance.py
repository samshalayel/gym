from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Time, func

from app.database import Base


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False, index=True)
    attendance_date = Column(Date, server_default=func.current_date(), nullable=False, index=True)
    check_in = Column(Time, nullable=False)
    check_out = Column(Time, nullable=True)
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
