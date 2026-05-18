from sqlalchemy.orm import Session
from app.models.nutrition import NutritionPlan
from app.schemas.nutrition import NutritionPlanCreate, NutritionPlanUpdate


def get_nutrition_plans(db: Session, skip: int = 0, limit: int = 100):
    return db.query(NutritionPlan).offset(skip).limit(limit).all()


def get_nutrition_plan(db: Session, np_id: int):
    return db.query(NutritionPlan).filter(NutritionPlan.id == np_id).first()


def get_member_nutrition_plans(db: Session, member_id: int):
    return db.query(NutritionPlan).filter(NutritionPlan.member_id == member_id).all()


def create_nutrition_plan(db: Session, data: NutritionPlanCreate):
    np = NutritionPlan(**data.model_dump())
    db.add(np)
    db.commit()
    db.refresh(np)
    return np


def update_nutrition_plan(db: Session, np_id: int, data: NutritionPlanUpdate):
    np = db.query(NutritionPlan).filter(NutritionPlan.id == np_id).first()
    if not np:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(np, key, value)
    db.commit()
    db.refresh(np)
    return np


def delete_nutrition_plan(db: Session, np_id: int):
    np = db.query(NutritionPlan).filter(NutritionPlan.id == np_id).first()
    if np:
        db.delete(np)
        db.commit()
        return True
    return False
