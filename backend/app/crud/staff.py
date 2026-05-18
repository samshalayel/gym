from sqlalchemy.orm import Session
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate


def get_all_staff(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Staff).offset(skip).limit(limit).all()


def get_staff(db: Session, staff_id: int):
    return db.query(Staff).filter(Staff.id == staff_id).first()


def get_trainers(db: Session):
    return (
        db.query(Staff).filter(Staff.role == "trainer", Staff.is_active == "true").all()
    )


def create_staff(db: Session, data: StaffCreate):
    staff = Staff(**data.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


def update_staff(db: Session, staff_id: int, data: StaffUpdate):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)
    db.commit()
    db.refresh(staff)
    return staff


def delete_staff(db: Session, staff_id: int):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if staff:
        db.delete(staff)
        db.commit()
        return True
    return False
