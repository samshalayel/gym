from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class WorkoutType(Base):
    __tablename__ = "workout_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    target_muscles = Column(String(255))
    difficulty = Column(String(20), default="beginner")
    category = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    name = Column(String(100), nullable=False)
    exercises = Column(Text)
    days_per_week = Column(Integer, default=3)
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="workout_plans")
