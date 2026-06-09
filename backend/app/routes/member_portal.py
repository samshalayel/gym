from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.membership_plan import MembershipPlan
from app.models.attendance import Attendance
from app.auth.auth import get_current_user
from app.crud.subscription import (
    get_member_subscriptions,
    count_attended_subscription_sessions,
)
from app.crud.appointment import get_member_appointments
from app.crud.workout import get_member_workout_plans
from app.crud.nutrition import get_member_nutrition_plans

router = APIRouter(prefix="/api/member-portal", tags=["member-portal"])


def _days_remaining(end) -> int:
    return (end - date.today()).days


@router.get("/me")
def get_member_portal(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role != "member":
        raise HTTPException(status_code=403, detail="Accessible by members only")

    member = db.query(Member).filter(Member.id == current_user.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    subscriptions = get_member_subscriptions(db, member.id)
    plan_map = {p.id: p for p in db.query(MembershipPlan).all()}

    today = date.today()
    sub_payload = []
    total_debt = 0.0
    active_sub = None
    for s in subscriptions:
        plan = plan_map.get(s.plan_id)
        plan_price = (plan.price if plan else 0) or 0
        expected = max(plan_price - (s.discount_amount or 0), 0)
        remaining_money = max(expected - (s.amount_paid or 0), 0)
        total_debt += remaining_money

        session_limit = s.session_count if s.session_count is not None else (plan.session_count if plan else None)
        used_sessions = count_attended_subscription_sessions(db, s)
        remaining_sessions = (max(session_limit - used_sessions, 0) if session_limit else None)

        is_active = s.start_date <= today <= s.end_date and (s.payment_status or "").lower() == "paid"
        days_left = _days_remaining(s.end_date)

        entry = {
            "id": s.id,
            "plan_id": s.plan_id,
            "plan_name": plan.name if plan else f"#{s.plan_id}",
            "plan_price": plan_price,
            "start_date": str(s.start_date),
            "end_date": str(s.end_date),
            "days_remaining": days_left,
            "is_active": is_active,
            "amount_paid": s.amount_paid or 0,
            "expected": expected,
            "remaining_money": remaining_money,
            "payment_status": s.payment_status,
            "payment_method": s.payment_method,
            "session_count": session_limit,
            "used_sessions": used_sessions,
            "remaining_sessions": remaining_sessions,
            "training_days": s.training_days or "all",
            "renewal_status": s.renewal_status,
            "notes": s.notes,
        }
        sub_payload.append(entry)
        if is_active and (active_sub is None or s.end_date > date.fromisoformat(active_sub["end_date"])):
            active_sub = entry

    # ── Attendance history (most recent first) ──
    attendance_rows = (
        db.query(Attendance)
        .filter(Attendance.member_id == member.id)
        .order_by(Attendance.checked_in_at.desc())
        .limit(60)
        .all()
    )
    attendance = [
        {
            "id": a.id,
            "checked_in_at": a.checked_in_at.isoformat() if a.checked_in_at else None,
            "date": a.checked_in_at.date().isoformat() if a.checked_in_at else None,
            "note": a.note,
        }
        for a in attendance_rows
    ]

    # ── Alerts ──
    alerts = []
    if active_sub:
        if active_sub["days_remaining"] <= 5:
            alerts.append({
                "type": "expiry",
                "level": "warning",
                "ar": f"اشتراكك ينتهي خلال {active_sub['days_remaining']} يوم",
                "en": f"Your subscription expires in {active_sub['days_remaining']} days",
            })
        if active_sub["remaining_sessions"] is not None and active_sub["remaining_sessions"] <= 2:
            alerts.append({
                "type": "sessions",
                "level": "warning",
                "ar": f"تبقى لك {active_sub['remaining_sessions']} جلسات فقط",
                "en": f"Only {active_sub['remaining_sessions']} sessions left",
            })
    else:
        alerts.append({
            "type": "no_active",
            "level": "danger",
            "ar": "لا يوجد اشتراك نشط — يرجى التجديد",
            "en": "No active subscription — please renew",
        })
    if total_debt > 0:
        alerts.append({
            "type": "debt",
            "level": "danger",
            "ar": f"يوجد مبلغ مستحق عليك: {total_debt:.2f} ₪",
            "en": f"Outstanding balance: {total_debt:.2f} ₪",
        })

    appointments = get_member_appointments(db, member.id)
    workout_plans = get_member_workout_plans(db, member.id)
    nutrition_plans = get_member_nutrition_plans(db, member.id)

    return {
        "member": {
            "id": member.id,
            "member_code": member.member_code,
            "name": member.name,
            "phone": member.phone,
            "email": member.email,
            "gender": member.gender,
            "age": member.age,
            "address": member.address,
            "status": member.status,
            "emergency_contact": member.emergency_contact,
            "emergency_phone": member.emergency_phone,
        },
        "summary": {
            "total_debt": total_debt,
            "active_subscription": active_sub,
            "total_attendance": len(attendance),
        },
        "alerts": alerts,
        "subscriptions": sub_payload,
        "attendance": attendance,
        "appointments": [
            {
                "id": a.id,
                "trainer_id": a.trainer_id,
                "date": str(a.date),
                "time": str(a.time),
                "duration": a.duration,
                "type": a.type,
                "status": a.status,
                "notes": a.notes,
            }
            for a in appointments
        ],
        "workout_plans": [
            {
                "id": w.id,
                "name": w.name,
                "exercises": w.exercises,
                "days_per_week": w.days_per_week,
                "notes": w.notes,
            }
            for w in workout_plans
        ],
        "nutrition_plans": [
            {
                "id": n.id,
                "goal": n.goal,
                "meals_per_day": n.meals_per_day,
                "calories": n.calories,
                "protein_g": n.protein_g,
                "carbs_g": n.carbs_g,
                "fats_g": n.fats_g,
                "meal_plan": n.meal_plan,
            }
            for n in nutrition_plans
        ],
    }
