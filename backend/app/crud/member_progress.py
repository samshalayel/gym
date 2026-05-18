from sqlalchemy.orm import Session

from app.models.member_progress import MemberProgress
from app.schemas.member_progress import MemberProgressCreate, MemberProgressUpdate


def get_member_progress(db: Session, member_id: int):
    return (
        db.query(MemberProgress)
        .filter(MemberProgress.member_id == member_id)
        .order_by(MemberProgress.recorded_at.asc())
        .all()
    )


def get_progress_entry(db: Session, entry_id: int):
    return db.query(MemberProgress).filter(MemberProgress.id == entry_id).first()


def create_member_progress(db: Session, data: MemberProgressCreate):
    entry = MemberProgress(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_member_progress(db: Session, entry_id: int, data: MemberProgressUpdate):
    entry = get_progress_entry(db, entry_id)
    if not entry:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_member_progress(db: Session, entry_id: int):
    entry = get_progress_entry(db, entry_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True
