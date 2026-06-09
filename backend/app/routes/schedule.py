"""
Schedule / time-slot query.

Members are spread across hourly slots to avoid crowding:
  - Females: 06:00 .. 11:00  (morning)
  - Males:   12:00 .. 23:00  (noon to midnight)
Each subscription carries a time_slot ("06:00") and training_type
("weights"=حديد | "fitness"=لياقة).

The query screen picks a weekday + slot + type and lists the members
who are expected to come.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.subscription import Subscription
from app.models.member import Member
from app.crud.subscription import TRAINING_DAY_MAP

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

# Python weekday(): Mon=0 .. Sun=6
WEEKDAY_INDEX = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

FEMALE_SLOTS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"]
MALE_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
              "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]


@router.get("/slots")
def list_slots():
    """Static slot definitions for the UI."""
    return {
        "female": FEMALE_SLOTS,
        "male": MALE_SLOTS,
        "training_types": [
            {"key": "weights", "ar": "حديد", "en": "Weights"},
            {"key": "fitness", "ar": "لياقة", "en": "Fitness"},
        ],
    }


@router.get("/query")
def query_schedule(
    weekday: str,
    slot: Optional[str] = None,
    training_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Members expected on a given weekday / slot / training type."""
    today = date.today()
    wd = WEEKDAY_INDEX.get((weekday or "").lower())

    rows = (
        db.query(Subscription, Member)
        .join(Member, Subscription.member_id == Member.id)
        .filter(
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            func.lower(func.trim(Subscription.payment_status)) == "paid",
            or_(
                Subscription.renewal_status.notin_(["expired", "changed"]),
                Subscription.renewal_status.is_(None),
            ),
        )
    )

    if slot:
        rows = rows.filter(Subscription.time_slot == slot)
    if training_type:
        rows = rows.filter(Subscription.training_type == training_type)

    items = []
    for sub, member in rows.all():
        # Keep only members whose training days include the chosen weekday.
        allowed_days = TRAINING_DAY_MAP.get(sub.training_days or "all", TRAINING_DAY_MAP["all"])
        if wd is not None and wd not in allowed_days:
            continue
        items.append({
            "member_id": member.id,
            "member_code": member.member_code,
            "name": member.name,
            "phone": member.phone,
            "gender": member.gender,
            "time_slot": sub.time_slot,
            "training_type": sub.training_type,
            "training_days": sub.training_days,
        })

    items.sort(key=lambda x: (x["time_slot"] or "", x["name"] or ""))
    return {"total": len(items), "items": items}
