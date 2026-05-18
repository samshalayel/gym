from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from datetime import date


def get_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Subscription).offset(skip).limit(limit).all()


def get_subscription_count(db: Session):
    return db.query(Subscription).count()


def get_subscription(db: Session, sub_id: int):
    return db.query(Subscription).filter(Subscription.id == sub_id).first()


def get_member_subscriptions(db: Session, member_id: int):
    return db.query(Subscription).filter(Subscription.member_id == member_id).all()


def create_subscription(db: Session, data: SubscriptionCreate):
    sub = Subscription(**data.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def update_subscription(db: Session, sub_id: int, data: SubscriptionUpdate):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, key, value)
    db.commit()
    db.refresh(sub)
    return sub


def delete_subscription(db: Session, sub_id: int):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if sub:
        db.delete(sub)
        db.commit()
        return True
    return False


def get_active_subscriptions_count(db: Session):
    return db.query(Subscription).filter(Subscription.end_date >= date.today()).count()


def get_expired_subscriptions_count(db: Session):
    return db.query(Subscription).filter(Subscription.end_date < date.today()).count()


def get_revenue_summary(db: Session):
    result = db.query(func.sum(Subscription.amount_paid)).scalar()
    return result or 0
