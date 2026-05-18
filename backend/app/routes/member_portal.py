from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.auth.auth import get_current_user
from app.crud.subscription import get_member_subscriptions
from app.crud.appointment import get_member_appointments
from app.crud.workout import get_member_workout_plans
from app.crud.nutrition import get_member_nutrition_plans

router = APIRouter(prefix="/api/member-portal", tags=["member-portal"])


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
    appointments = get_member_appointments(db, member.id)
    workout_plans = get_member_workout_plans(db, member.id)
    nutrition_plans = get_member_nutrition_plans(db, member.id)

    return {
        "member": {
            "id": member.id,
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
        "subscriptions": [
            {
                "id": s.id,
                "plan_id": s.plan_id,
                "offer_id": s.offer_id,
                "start_date": str(s.start_date),
                "end_date": str(s.end_date),
                "amount_paid": s.amount_paid,
                "payment_status": s.payment_status,
                "renewal_status": s.renewal_status,
                "notes": s.notes,
            }
            for s in subscriptions
        ],
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
