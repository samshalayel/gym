from fastapi import APIRouter, Depends
from datetime import date, timedelta
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.member import get_member_count
from app.crud.subscription import (
    get_active_subscriptions_count,
    get_expired_subscriptions_count,
    get_revenue_summary,
)
from app.crud.equipment import get_equipment_needing_maintenance
from app.models.member import Member
from app.models.subscription import Subscription

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def upcoming_birthdays(db: Session, days: int = 14):
    today = date.today()
    members = db.query(Member).filter(Member.birth_date.isnot(None)).all()
    items = []
    for member in members:
        birthday = member.birth_date.replace(year=today.year)
        if birthday < today:
            birthday = birthday.replace(year=today.year + 1)
        diff = (birthday - today).days
        if diff <= days:
            items.append({
                "member_id": member.id,
                "name": member.name,
                "phone": member.phone,
                "birth_date": member.birth_date,
                "days_remaining": diff,
            })
    return sorted(items, key=lambda item: item["days_remaining"])


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    return {
        "total_members": get_member_count(db),
        "active_subscriptions": get_active_subscriptions_count(db),
        "expired_subscriptions": get_expired_subscriptions_count(db),
        "total_revenue": get_revenue_summary(db),
        "equipment_needing_maintenance": len(get_equipment_needing_maintenance(db)),
        "unpaid_subscriptions": db.query(Subscription).filter(Subscription.payment_status != "paid").count(),
        "birthdays": upcoming_birthdays(db),
    }
