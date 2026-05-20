from sqlalchemy import Column, Date, DateTime, Float, Integer, String, Text, func

from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    paid_by = Column(String(100), nullable=False)
    expense_date = Column(Date, server_default=func.current_date(), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
