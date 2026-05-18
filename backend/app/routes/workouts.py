from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.workout import *
from app.schemas.workout import *

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


@router.get("/types")
def list_workout_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_workout_types(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.post("/types", status_code=201)
def create_workout_type_endpoint(
    data: WorkoutTypeCreate, db: Session = Depends(get_db)
):
    return create_workout_type(db, data)


@router.put("/types/{wt_id}")
def update_workout_type_endpoint(
    wt_id: int, data: WorkoutTypeUpdate, db: Session = Depends(get_db)
):
    item = update_workout_type(db, wt_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Workout type not found")
    return item


@router.delete("/types/{wt_id}")
def delete_workout_type_endpoint(wt_id: int, db: Session = Depends(get_db)):
    if not delete_workout_type(db, wt_id):
        raise HTTPException(status_code=404, detail="Workout type not found")
    return {"message": "Workout type deleted successfully"}


@router.get("/exercises")
def list_exercises(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_exercises(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.post("/exercises", status_code=201)
def create_exercise_endpoint(data: ExerciseCreate, db: Session = Depends(get_db)):
    return create_exercise(db, data)


@router.put("/exercises/{ex_id}")
def update_exercise_endpoint(
    ex_id: int, data: ExerciseUpdate, db: Session = Depends(get_db)
):
    item = update_exercise(db, ex_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return item


@router.delete("/exercises/{ex_id}")
def delete_exercise_endpoint(ex_id: int, db: Session = Depends(get_db)):
    if not delete_exercise(db, ex_id):
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"message": "Exercise deleted successfully"}


@router.get("/plans")
def list_workout_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_workout_plans(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/plans/by-member/{member_id}")
def member_workout_plans(member_id: int, db: Session = Depends(get_db)):
    items = get_member_workout_plans(db, member_id)
    return {"total": len(items), "items": items}


@router.post("/plans", status_code=201)
def create_workout_plan_endpoint(
    data: WorkoutPlanCreate, db: Session = Depends(get_db)
):
    return create_workout_plan(db, data)


@router.put("/plans/{wp_id}")
def update_workout_plan_endpoint(
    wp_id: int, data: WorkoutPlanUpdate, db: Session = Depends(get_db)
):
    item = update_workout_plan(db, wp_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return item


@router.delete("/plans/{wp_id}")
def delete_workout_plan_endpoint(wp_id: int, db: Session = Depends(get_db)):
    if not delete_workout_plan(db, wp_id):
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"message": "Workout plan deleted successfully"}
