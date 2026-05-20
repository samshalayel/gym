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


def get_members(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Member)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
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
        )
    if status and status != "all":
        query = query.filter(Member.status == status)
    return query.count()


def get_member(db: Session, member_id: int):
    return db.query(Member).filter(Member.id == member_id).first()


def create_member(db: Session, data: MemberCreate):
    member = Member(**data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_member(db: Session, member_id: int, data: MemberUpdate):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
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
