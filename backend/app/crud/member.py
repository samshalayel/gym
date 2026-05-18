from sqlalchemy.orm import Session
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate


def get_members(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(Member)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
        )
    return query.offset(skip).limit(limit).all()


def get_member_count(db: Session, search: str = None):
    query = db.query(Member)
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
        )
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
    if member:
        db.delete(member)
        db.commit()
        return True
    return False
