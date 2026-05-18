from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NutritionPlanBase(BaseModel):
    member_id: int
    goal: str
    meals_per_day: Optional[int] = 3
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fats_g: Optional[float] = None
    meal_plan: Optional[str] = None
    notes: Optional[str] = None


class NutritionPlanCreate(NutritionPlanBase):
    pass


class NutritionPlanUpdate(BaseModel):
    goal: Optional[str] = None
    meals_per_day: Optional[int] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fats_g: Optional[float] = None
    meal_plan: Optional[str] = None
    notes: Optional[str] = None


class NutritionPlanResponse(NutritionPlanBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
