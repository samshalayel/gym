from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.subscription import Subscription
from app.models.subscription import SubscriptionPayment
from app.models.attendance import Attendance
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from datetime import date, timedelta

_INACTIVE_STATUSES = ["expired", "changed"]
TRAINING_DAY_MAP = {
    "sat_mon_wed": {5, 0, 2},
    "sun_tue_thu": {6, 1, 3},
    "all": {0, 1, 2, 3, 5, 6},  # Mon–Thu + Sat–Sun; Fri (4) excluded (gym closed)
}
_DAY_CODE_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


def subscription_training_weekdays(sub: Subscription):
    val = sub.training_days or "all"
    if val in TRAINING_DAY_MAP:
        return TRAINING_DAY_MAP[val]
    # parse comma-separated custom days e.g. "sat,mon,wed"
    days = {_DAY_CODE_MAP[p.strip()] for p in val.split(",") if p.strip() in _DAY_CODE_MAP}
    return days if days else TRAINING_DAY_MAP["all"]


def iter_scheduled_dates(sub: Subscription, until: date):
    current = sub.start_date
    last_day = min(sub.end_date, until)
    weekdays = subscription_training_weekdays(sub)
    while current <= last_day:
        if current.weekday() in weekdays:
            yield current
        current += timedelta(days=1)


def is_subscription_due_on(sub: Subscription, day: date):
    return day.weekday() in subscription_training_weekdays(sub)


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
    """Count attended sessions plus scheduled days that already passed without attendance."""
    attendance_dates = {
        row[0]
        for row in (
            db.query(func.date(Attendance.checked_in_at))
            .filter(
                Attendance.member_id == sub.member_id,
                func.date(Attendance.checked_in_at) >= sub.start_date.isoformat(),
                func.date(Attendance.checked_in_at) <= sub.end_date.isoformat(),
            )
            .all()
        )
    }
    scheduled_until_yesterday = date.today() - timedelta(days=1)
    scheduled_dates = {day.isoformat() for day in iter_scheduled_dates(sub, scheduled_until_yesterday)}
    return len(attendance_dates | scheduled_dates)


def count_attended_subscription_sessions(db: Session, sub: Subscription) -> int:
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
    # Lazy-expire only when ACTUAL attendance has exhausted the session quota.
    # Absent scheduled days must NEVER consume sessions (accounting requirement).
    if sub.session_count is not None and sub.session_count > 0:
        used = count_attended_subscription_sessions(db, sub)
        if used >= sub.session_count:
            expire_subscription(db, sub)
            return None
    return sub


def create_subscription(db: Session, data: SubscriptionCreate):
    payload = data.model_dump()
    # Transient field not present on the Subscription model.
    payload.pop("collection_date", None)
    sub = Subscription(**payload)
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
        # Remove linked payment rows first to satisfy the foreign key.
        db.query(SubscriptionPayment).filter(
            SubscriptionPayment.subscription_id == sub_id
        ).delete(synchronize_session=False)
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
            func.lower(func.trim(Subscription.payment_status)) == "paid",
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
        .filter(Subscription.end_date < today)
        .count()
    )


def get_revenue_summary(db: Session, start_date: date = None, end_date: date = None):
    payment_query = db.query(func.sum(SubscriptionPayment.amount))
    if start_date:
        payment_query = payment_query.filter(SubscriptionPayment.payment_date >= start_date)
    if end_date:
        payment_query = payment_query.filter(SubscriptionPayment.payment_date <= end_date)
    payment_total = payment_query.scalar() or 0

    legacy_query = db.query(func.sum(Subscription.amount_paid)).filter(
        Subscription.amount_paid > 0,
        ~Subscription.id.in_(db.query(SubscriptionPayment.subscription_id)),
    )
    if start_date:
        legacy_query = legacy_query.filter(Subscription.start_date >= start_date)
    if end_date:
        legacy_query = legacy_query.filter(Subscription.start_date <= end_date)
    legacy_total = legacy_query.scalar() or 0
    return payment_total + legacy_total
