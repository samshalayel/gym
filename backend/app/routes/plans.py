from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.membership_plan import (
    get_plans,
    get_plan,
    create_plan,
    update_plan,
    delete_plan,
)
from app.schemas.membership_plan import (
    MembershipPlanCreate,
    MembershipPlanUpdate,
    MembershipPlanResponse,
)

router = APIRouter(prefix="/api/plans", tags=["membership_plans"])


@router.get("")
def list_plans(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    plans = get_plans(db, skip=skip, limit=limit)
    return {"total": len(plans), "items": plans}


@router.get("/{plan_id}", response_model=MembershipPlanResponse)
def get_plan_detail(plan_id: int, db: Session = Depends(get_db)):
    plan = get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("", response_model=MembershipPlanResponse, status_code=201)
def create_plan_endpoint(data: MembershipPlanCreate, db: Session = Depends(get_db)):
    return create_plan(db, data)


@router.put("/{plan_id}", response_model=MembershipPlanResponse)
def update_plan_endpoint(
    plan_id: int, data: MembershipPlanUpdate, db: Session = Depends(get_db)
):
    plan = update_plan(db, plan_id, data)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.delete("/{plan_id}")
def delete_plan_endpoint(plan_id: int, db: Session = Depends(get_db)):
    if not delete_plan(db, plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted successfully"}
