from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.nutrition import (
    get_nutrition_plans,
    get_nutrition_plan,
    get_member_nutrition_plans,
    create_nutrition_plan,
    update_nutrition_plan,
    delete_nutrition_plan,
)
from app.schemas.nutrition import (
    NutritionPlanCreate,
    NutritionPlanUpdate,
    NutritionPlanResponse,
)

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


@router.get("/plans")
def list_nutrition_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_nutrition_plans(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/plans/by-member/{member_id}")
def member_nutrition_plans(member_id: int, db: Session = Depends(get_db)):
    items = get_member_nutrition_plans(db, member_id)
    return {"total": len(items), "items": items}


@router.get("/plans/{np_id}", response_model=NutritionPlanResponse)
def get_nutrition_plan_detail(np_id: int, db: Session = Depends(get_db)):
    item = get_nutrition_plan(db, np_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nutrition plan not found")
    return item


@router.post("/plans", response_model=NutritionPlanResponse, status_code=201)
def create_nutrition_plan_endpoint(
    data: NutritionPlanCreate, db: Session = Depends(get_db)
):
    return create_nutrition_plan(db, data)


@router.put("/plans/{np_id}", response_model=NutritionPlanResponse)
def update_nutrition_plan_endpoint(
    np_id: int, data: NutritionPlanUpdate, db: Session = Depends(get_db)
):
    item = update_nutrition_plan(db, np_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Nutrition plan not found")
    return item


@router.delete("/plans/{np_id}")
def delete_nutrition_plan_endpoint(np_id: int, db: Session = Depends(get_db)):
    if not delete_nutrition_plan(db, np_id):
        raise HTTPException(status_code=404, detail="Nutrition plan not found")
    return {"message": "Nutrition plan deleted successfully"}
