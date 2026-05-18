from sqlalchemy.orm import Session
from app.models.membership_plan import MembershipPlan
from app.schemas.membership_plan import MembershipPlanCreate, MembershipPlanUpdate


def get_plans(db: Session, skip: int = 0, limit: int = 100):
    return db.query(MembershipPlan).offset(skip).limit(limit).all()


def get_plan(db: Session, plan_id: int):
    return db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()


def create_plan(db: Session, data: MembershipPlanCreate):
    plan = MembershipPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(db: Session, plan_id: int, data: MembershipPlanUpdate):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return plan


def delete_plan(db: Session, plan_id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if plan:
        db.delete(plan)
        db.commit()
        return True
    return False
