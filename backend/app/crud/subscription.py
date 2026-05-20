from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.subscription import Subscription
from app.models.attendance import Attendance
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from datetime import date

_INACTIVE_STATUSES = ["expired", "changed"]


def get_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Subscription).offset(skip).limit(limit).all()


def get_subscription_count(db: Session):
    return db.query(Subscription).count()


def get_subscription(db: Session, sub_id: int):
    return db.query(Subscription).filter(Subscription.id == sub_id).first()


def get_member_subscriptions(db: Session, member_id: int):
    return db.query(Subscription).filter(Subscription.member_id == member_id).order_by(Subscription.start_date.desc()).all()


def get_member_latest_subscription(db: Session, member_id: int):
    return (
        db.query(Subscription)
        .filter(Subscription.member_id == member_id)
        .order_by(Subscription.end_date.desc(), Subscription.id.desc())
        .first()
    )


def count_subscription_sessions(db: Session, sub: Subscription) -> int:
    """Count attendance records within the subscription's date range."""
    return (
        db.query(Attendance)
        .filter(
            Attendance.member_id == sub.member_id,
            func.date(Attendance.checked_in_at) >= sub.start_date.isoformat(),
            func.date(Attendance.checked_in_at) <= sub.end_date.isoformat(),
        )
        .count()
    )


def expire_subscription(db: Session, sub: Subscription) -> None:
    """Mark subscription as expired and update member status accordingly."""
    from app.models.member import Member
    sub.renewal_status = "expired"
    member = db.query(Member).filter(Member.id == sub.member_id).first()
    if member and member.status not in ("frozen", "canceled"):
        member.status = "expired"
    db.commit()


def activate_member(db: Session, member_id: int) -> None:
    """Reset member status to active when a new subscription is created."""
    from app.models.member import Member
    member = db.query(Member).filter(Member.id == member_id).first()
    if member and member.status not in ("frozen", "canceled"):
        member.status = "active"
    db.commit()


def get_member_active_subscription(db: Session, member_id: int):
    today = date.today()
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.member_id == member_id,
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            or_(
                Subscription.renewal_status.notin_(_INACTIVE_STATUSES),
                Subscription.renewal_status.is_(None),
            ),
        )
        .order_by(Subscription.end_date.desc())
        .first()
    )
    if sub is None:
        return None
    # Lazy-expire if session-based plan and sessions are exhausted
    if sub.session_count is not None and sub.session_count > 0:
        used = count_subscription_sessions(db, sub)
        if used >= sub.session_count:
            expire_subscription(db, sub)
            return None
    return sub


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
    today = date.today()
    return (
        db.query(Subscription)
        .filter(
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            or_(
                Subscription.renewal_status.notin_(_INACTIVE_STATUSES),
                Subscription.renewal_status.is_(None),
            ),
        )
        .count()
    )


def get_expired_subscriptions_count(db: Session):
    today = date.today()
    return (
        db.query(Subscription)
        .filter(
            (Subscription.end_date < today) | (Subscription.renewal_status == "expired")
        )
        .count()
    )


def get_revenue_summary(db: Session):
    result = db.query(func.sum(Subscription.amount_paid)).scalar()
    return result or 0
