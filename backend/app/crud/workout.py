from sqlalchemy.orm import Session
from app.models.workout import WorkoutType, Exercise, WorkoutPlan
from app.schemas.workout import (
    WorkoutTypeCreate,
    WorkoutTypeUpdate,
    ExerciseCreate,
    ExerciseUpdate,
    WorkoutPlanCreate,
    WorkoutPlanUpdate,
)


def get_workout_types(db: Session, skip: int = 0, limit: int = 100):
    return db.query(WorkoutType).offset(skip).limit(limit).all()


def get_workout_type(db: Session, wt_id: int):
    return db.query(WorkoutType).filter(WorkoutType.id == wt_id).first()


def create_workout_type(db: Session, data: WorkoutTypeCreate):
    wt = WorkoutType(**data.model_dump())
    db.add(wt)
    db.commit()
    db.refresh(wt)
    return wt


def update_workout_type(db: Session, wt_id: int, data: WorkoutTypeUpdate):
    wt = db.query(WorkoutType).filter(WorkoutType.id == wt_id).first()
    if not wt:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wt, key, value)
    db.commit()
    db.refresh(wt)
    return wt


def delete_workout_type(db: Session, wt_id: int):
    wt = db.query(WorkoutType).filter(WorkoutType.id == wt_id).first()
    if wt:
        db.delete(wt)
        db.commit()
        return True
    return False


def get_exercises(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Exercise).offset(skip).limit(limit).all()


def get_exercise(db: Session, ex_id: int):
    return db.query(Exercise).filter(Exercise.id == ex_id).first()


def create_exercise(db: Session, data: ExerciseCreate):
    ex = Exercise(**data.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


def update_exercise(db: Session, ex_id: int, data: ExerciseUpdate):
    ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
    if not ex:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ex, key, value)
    db.commit()
    db.refresh(ex)
    return ex


def delete_exercise(db: Session, ex_id: int):
    ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
    if ex:
        db.delete(ex)
        db.commit()
        return True
    return False


def get_workout_plans(db: Session, skip: int = 0, limit: int = 100):
    return db.query(WorkoutPlan).offset(skip).limit(limit).all()


def get_workout_plan(db: Session, wp_id: int):
    return db.query(WorkoutPlan).filter(WorkoutPlan.id == wp_id).first()


def get_member_workout_plans(db: Session, member_id: int):
    return db.query(WorkoutPlan).filter(WorkoutPlan.member_id == member_id).all()


def create_workout_plan(db: Session, data: WorkoutPlanCreate):
    wp = WorkoutPlan(**data.model_dump())
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp


def update_workout_plan(db: Session, wp_id: int, data: WorkoutPlanUpdate):
    wp = db.query(WorkoutPlan).filter(WorkoutPlan.id == wp_id).first()
    if not wp:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wp, key, value)
    db.commit()
    db.refresh(wp)
    return wp


def delete_workout_plan(db: Session, wp_id: int):
    wp = db.query(WorkoutPlan).filter(WorkoutPlan.id == wp_id).first()
    if wp:
        db.delete(wp)
        db.commit()
        return True
    return False
