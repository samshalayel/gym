from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.member import get_member_count
from app.crud.subscription import (
    get_active_subscriptions_count,
    get_expired_subscriptions_count,
    get_revenue_summary,
)
from app.crud.appointment import get_today_appointments_count
from app.crud.equipment import get_equipment_needing_maintenance

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    return {
        "total_members": get_member_count(db),
        "active_subscriptions": get_active_subscriptions_count(db),
        "expired_subscriptions": get_expired_subscriptions_count(db),
        "today_appointments": get_today_appointments_count(db),
        "total_revenue": get_revenue_summary(db),
        "equipment_needing_maintenance": len(get_equipment_needing_maintenance(db)),
    }
