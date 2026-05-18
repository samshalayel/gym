from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkoutTypeBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None


class WorkoutTypeCreate(WorkoutTypeBase):
    pass


class WorkoutTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class WorkoutTypeResponse(WorkoutTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_muscles: Optional[str] = None
    difficulty: Optional[str] = "beginner"
    category: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_muscles: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None


class ExerciseResponse(ExerciseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorkoutPlanBase(BaseModel):
    member_id: int
    name: str
    exercises: Optional[str] = None
    days_per_week: Optional[int] = 3
    notes: Optional[str] = None


class WorkoutPlanCreate(WorkoutPlanBase):
    pass


class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    exercises: Optional[str] = None
    days_per_week: Optional[int] = None
    notes: Optional[str] = None


class WorkoutPlanResponse(WorkoutPlanBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
