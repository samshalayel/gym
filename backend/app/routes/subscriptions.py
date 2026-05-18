from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.subscription import (
    get_subscriptions,
    get_subscription,
    get_member_subscriptions,
    get_subscription_count,
    create_subscription,
    update_subscription,
    delete_subscription,
)
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


@router.get("")
def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    subs = get_subscriptions(db, skip=skip, limit=limit)
    total_count = get_subscription_count(db)
    return {"total": len(subs), "total_count": total_count, "items": subs}


@router.get("/by-member/{member_id}")
def member_subscriptions(member_id: int, db: Session = Depends(get_db)):
    subs = get_member_subscriptions(db, member_id)
    return {"total": len(subs), "items": subs}


@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription_detail(sub_id: int, db: Session = Depends(get_db)):
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.post("", response_model=SubscriptionResponse, status_code=201)
def create_subscription_endpoint(
    data: SubscriptionCreate, db: Session = Depends(get_db)
):
    return create_subscription(db, data)


@router.put("/{sub_id}", response_model=SubscriptionResponse)
def update_subscription_endpoint(
    sub_id: int, data: SubscriptionUpdate, db: Session = Depends(get_db)
):
    sub = update_subscription(db, sub_id, data)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.delete("/{sub_id}")
def delete_subscription_endpoint(sub_id: int, db: Session = Depends(get_db)):
    if not delete_subscription(db, sub_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted successfully"}
