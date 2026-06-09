from datetime import timedelta

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
from app.models.equipment import EquipmentMaintenanceLog
from app.schemas.equipment import EquipmentMaintenanceLogCreate, EquipmentMaintenanceLogUpdate

router = APIRouter(prefix="/api/equipment", tags=["equipment"])


def sync_equipment_maintenance_state(db: Session, item):
    open_count = (
        db.query(EquipmentMaintenanceLog)
        .filter(
            EquipmentMaintenanceLog.equipment_id == item.id,
            EquipmentMaintenanceLog.status == "open",
        )
        .count()
    )
    if open_count > 0:
        item.maintenance_status = "needs_service"
        item.condition = "poor"
        return
    item.maintenance_status = "ok"
    if item.condition == "poor":
        item.condition = "good"


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


@router.get("/{equip_id}/maintenance-logs")
def get_equipment_maintenance_logs(equip_id: int, db: Session = Depends(get_db)):
    if not get_equipment(db, equip_id):
        raise HTTPException(status_code=404, detail="Equipment not found")
    items = (
        db.query(EquipmentMaintenanceLog)
        .filter(EquipmentMaintenanceLog.equipment_id == equip_id)
        .order_by(EquipmentMaintenanceLog.issue_date.desc(), EquipmentMaintenanceLog.id.desc())
        .all()
    )
    return {"total": len(items), "items": items}


@router.post("/{equip_id}/maintenance-logs", status_code=201)
def create_equipment_maintenance_log(
    equip_id: int,
    data: EquipmentMaintenanceLogCreate,
    db: Session = Depends(get_db),
):
    item = get_equipment(db, equip_id)
    if not item:
        raise HTTPException(status_code=404, detail="Equipment not found")
    payload = data.model_dump()
    log = EquipmentMaintenanceLog(equipment_id=equip_id, **payload)
    db.add(log)
    if payload.get("status") == "repaired":
        repair_date = payload.get("repair_date") or payload.get("issue_date")
        if repair_date:
            item.last_maintenance = repair_date
            if not item.next_maintenance or item.next_maintenance <= repair_date:
                item.next_maintenance = repair_date + timedelta(days=30)
    sync_equipment_maintenance_state(db, item)
    db.commit()
    db.refresh(log)
    return log


@router.put("/maintenance-logs/{log_id}")
def update_equipment_maintenance_log(
    log_id: int,
    data: EquipmentMaintenanceLogUpdate,
    db: Session = Depends(get_db),
):
    log = db.query(EquipmentMaintenanceLog).filter(EquipmentMaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    item = get_equipment(db, log.equipment_id)
    if item:
        if log.repair_date:
            item.last_maintenance = log.repair_date
            if not item.next_maintenance or item.next_maintenance <= log.repair_date:
                item.next_maintenance = log.repair_date + timedelta(days=30)
        sync_equipment_maintenance_state(db, item)
    db.commit()
    db.refresh(log)
    return log


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
