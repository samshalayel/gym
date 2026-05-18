from sqlalchemy.orm import Session
from app.models.equipment import Equipment
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate
from datetime import date


def get_all_equipment(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Equipment).offset(skip).limit(limit).all()


def get_equipment(db: Session, equip_id: int):
    return db.query(Equipment).filter(Equipment.id == equip_id).first()


def create_equipment(db: Session, data: EquipmentCreate):
    equip = Equipment(**data.model_dump())
    db.add(equip)
    db.commit()
    db.refresh(equip)
    return equip


def update_equipment(db: Session, equip_id: int, data: EquipmentUpdate):
    equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if not equip:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(equip, key, value)
    db.commit()
    db.refresh(equip)
    return equip


def delete_equipment(db: Session, equip_id: int):
    equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if equip:
        db.delete(equip)
        db.commit()
        return True
    return False


def get_equipment_needing_maintenance(db: Session):
    return (
        db.query(Equipment)
        .filter(
            (Equipment.maintenance_status == "needs_service")
            | (Equipment.next_maintenance <= date.today())
        )
        .all()
    )
