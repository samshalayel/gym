from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.appointment import Appointment
from app.models.attendance import Attendance
from app.models.member import Member
from app.models.member_progress import MemberProgress
from app.models.nutrition import NutritionPlan
from app.models.subscription import Subscription
from app.models.user import User
from app.models.workout import WorkoutPlan
from app.schemas.member import MemberCreate, MemberUpdate
from datetime import date


def _next_member_code(db: Session) -> str:
    from sqlalchemy import func as sqlfunc
    max_code = db.query(sqlfunc.max(Member.member_code)).scalar()
    if max_code and str(max_code).isdigit():
        return str(int(max_code) + 1)
    return "10001"


def get_members(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Member)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
            | Member.member_code.ilike(f"%{search}%")
        )
    if status and status != "all":
        query = query.filter(Member.status == status)
    return query.offset(skip).limit(limit).all()


def get_member_count(db: Session, search: str = None, status: str = None):
    query = db.query(Member)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
            | Member.member_code.ilike(f"%{search}%")
        )
    if status and status != "all":
        query = query.filter(Member.status == status)
    return query.count()


def get_member(db: Session, member_id: int):
    return db.query(Member).filter(Member.id == member_id).first()


def computed_member_status(db: Session, member: Member):
    if member.status in ("canceled", "frozen"):
        return member.status
    today = date.today()
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.member_id == member.id,
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            Subscription.renewal_status.notin_(["expired", "changed"]),
        )
        .order_by(Subscription.end_date.desc())
        .first()
    )
    if not sub:
        return "expired"
    payment = (sub.payment_status or "").strip().lower()
    if payment == "paid":
        return "active"
    if payment == "partial":
        return "debtor"
    return "expired"


def create_member(db: Session, data: MemberCreate):
    dump = data.model_dump()
    if not dump.get("email"):
        dump["email"] = None
    member = Member(**dump)
    member.member_code = _next_member_code(db)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_member(db: Session, member_id: int, data: MemberUpdate):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return None
    updates = data.model_dump(exclude_unset=True)
    if "email" in updates and not updates["email"]:
        updates["email"] = None
    for key, value in updates.items():
        setattr(member, key, value)
    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return None

    has_financial_history = (
        db.query(Subscription.id)
        .filter(Subscription.member_id == member_id)
        .first()
        is not None
    )

    if has_financial_history:
        member.status = "canceled"
        db.query(User).filter(User.member_id == member_id).delete(synchronize_session=False)
        db.commit()
        return "archived"

    non_financial_models = (
        User,
        Attendance,
        MemberProgress,
        Appointment,
        WorkoutPlan,
        NutritionPlan,
    )
    try:
        for model in non_financial_models:
            db.query(model).filter(model.member_id == member_id).delete(synchronize_session=False)
        db.delete(member)
        db.commit()
        return "deleted"
    except IntegrityError:
        db.rollback()
        raise
