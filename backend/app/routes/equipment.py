from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.equipment import (
    get_all_equipment,
    get_equipment,
    create_equipment,
    update_equipment,
    delete_equipment,
    get_equipment_needing_maintenance,
)

router = APIRouter(prefix="/api/equipment", tags=["equipment"])


@router.get("")
def list_equipment(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    items = get_all_equipment(db, skip=skip, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/needs-maintenance")
def equipment_needs_maintenance(db: Session = Depends(get_db)):
    items = get_equipment_needing_maintenance(db)
    return {"total": len(items), "items": items}


@router.get("/{equip_id}")
def get_equipment_detail(equip_id: int, db: Session = Depends(get_db)):
    item = get_equipment(db, equip_id)
    if not item:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return item


@router.post("", status_code=201)
def create_equipment_endpoint(data: dict, db: Session = Depends(get_db)):
    from app.schemas.equipment import EquipmentCreate

    schema = EquipmentCreate(**data)
    return create_equipment(db, schema)


@router.put("/{equip_id}")
def update_equipment_endpoint(equip_id: int, data: dict, db: Session = Depends(get_db)):
    from app.schemas.equipment import EquipmentUpdate

    schema = EquipmentUpdate(**data)
    item = update_equipment(db, equip_id, schema)
    if not item:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return item


@router.delete("/{equip_id}")
def delete_equipment_endpoint(equip_id: int, db: Session = Depends(get_db)):
    if not delete_equipment(db, equip_id):
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"message": "Equipment deleted successfully"}
