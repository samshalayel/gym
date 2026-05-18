from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.member import Member


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    goal = Column(String(50), nullable=False)
    meals_per_day = Column(Integer, default=3)
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fats_g = Column(Float)
    meal_plan = Column(Text)
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="nutrition_plans")
