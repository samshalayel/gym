from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from sqlalchemy import func

from app.crud.attendance import (
    create_attendance,
    get_attendance,
    get_today_attendance_for_member,
    local_today,
)
from app.crud.member import get_member
from app.crud.subscription import count_subscription_sessions, expire_subscription
from app.database import get_db
from app.models.attendance import Attendance
from app.models.member import Member
from app.models.membership_plan import MembershipPlan
from app.models.subscription import Subscription
from app.schemas.attendance import AttendanceCreate

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def serialize_attendance(attendance, member):
    return {
        "id": attendance.id,
        "member_id": attendance.member_id,
        "member_name": member.name,
        "member_phone": member.phone,
        "member_status": member.status,
        "checked_in_at": attendance.checked_in_at,
        "duration_hours": attendance.duration_hours,
        "note": attendance.note,
    }


def subscription_summary(db: Session, member_id: int):
    subscription = (
        db.query(Subscription, MembershipPlan)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .filter(Subscription.member_id == member_id)
        .order_by(Subscription.end_date.desc())
        .first()
    )
    if not subscription:
        return None
    sub, plan = subscription
    # Use subscription's session_count first, fall back to plan's
    sessions_limit = sub.session_count if sub.session_count is not None else getattr(plan, "session_count", None)
    used_sessions = count_subscription_sessions(db, sub)
    return {
        "subscription_id": sub.id,
        "plan_name": plan.name,
        "start_date": sub.start_date,
        "end_date": sub.end_date,
        "renewal_status": sub.renewal_status,
        "session_count": sessions_limit,
        "used_sessions": used_sessions,
        "remaining_sessions": max(sessions_limit - used_sessions, 0) if sessions_limit else None,
    }


@router.get("")
def list_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    attendance_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    total_count, rows = get_attendance(
        db,
        skip=skip,
        limit=limit,
        search=search,
        attendance_date=attendance_date,
    )
    items = [serialize_attendance(attendance, member) for attendance, member in rows]
    return {"total": len(items), "total_count": total_count, "items": items}


@router.get("/eligible-members")
def eligible_attendance_members(search: Optional[str] = None, db: Session = Depends(get_db)):
    today = local_today()
    query = (
        db.query(Member, Subscription)
        .join(Subscription, Subscription.member_id == Member.id)
        .filter(
            Member.status == "active",
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            func.lower(func.trim(Subscription.payment_status)) == "paid",
            Subscription.renewal_status.notin_(["expired", "changed"]),
        )
        .order_by(Member.name.asc())
    )
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
        )
    seen = set()
    items = []
    for member, subscription in query.all():
        if member.id in seen:
            continue
        # Exclude members who exhausted their session quota
        if subscription.session_count is not None and subscription.session_count > 0:
            used = count_subscription_sessions(db, subscription)
            if used >= subscription.session_count:
                continue
        seen.add(member.id)
        item = {c.name: getattr(member, c.name) for c in member.__table__.columns}
        item["active_subscription_id"] = subscription.id
        item["subscription_end_date"] = subscription.end_date
        item["payment_status"] = subscription.payment_status
        items.append(item)
    return {"total": len(items), "items": items}


@router.get("/report")
def attendance_report(
    search: Optional[str] = None,
    active_only: bool = True,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    from sqlalchemy import and_

    # Build join conditions (optionally filter by date range)
    join_conds = [Attendance.member_id == Member.id]
    if start_date:
        join_conds.append(func.date(Attendance.checked_in_at) >= start_date.isoformat())
    if end_date:
        join_conds.append(func.date(Attendance.checked_in_at) <= end_date.isoformat())

    query = (
        db.query(
            Member.id.label("member_id"),
            Member.name.label("member_name"),
            Member.phone.label("member_phone"),
            Member.status.label("member_status"),
            func.count(Attendance.id).label("sessions_count"),
            func.coalesce(func.sum(Attendance.duration_hours), 0).label("total_hours"),
            func.max(Attendance.checked_in_at).label("last_check_in"),
        )
        .outerjoin(Attendance, and_(*join_conds))
        .group_by(Member.id)
    )

    if active_only:
        query = query.filter(Member.status == "active")

    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%")
            | Member.phone.ilike(f"%{search}%")
            | Member.email.ilike(f"%{search}%")
        )

    rows = query.order_by(func.max(Attendance.checked_in_at).desc().nullslast()).all()
    items = []
    for row in rows:
        summary = subscription_summary(db, row.member_id)
        items.append({
            "member_id": row.member_id,
            "member_name": row.member_name,
            "member_phone": row.member_phone,
            "member_status": row.member_status,
            "sessions_count": row.sessions_count,
            "total_hours": float(row.total_hours or 0),
            "last_check_in": row.last_check_in,
            "subscription": summary,
        })
    return {"total": len(items), "items": items}


@router.get("/report/{member_id}")
def attendance_member_report(member_id: int, db: Session = Depends(get_db)):
    member = get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    rows = (
        db.query(Attendance)
        .filter(Attendance.member_id == member_id)
        .order_by(Attendance.checked_in_at.desc())
        .all()
    )
    total_hours = sum(row.duration_hours or 0 for row in rows)
    return {
        "member": member,
        "sessions_count": len(rows),
        "total_hours": total_hours,
        "subscription": subscription_summary(db, member_id),
        "items": rows,
    }


@router.post("", status_code=201)
def create_attendance_endpoint(data: AttendanceCreate, db: Session = Depends(get_db)):
    member = get_member(db, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    today = local_today()
    active_subscription = (
        db.query(Subscription)
        .filter(
            Subscription.member_id == data.member_id,
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            Subscription.renewal_status.notin_(["expired", "changed"]),
        )
        .order_by(Subscription.end_date.desc())
        .first()
    )
    if not active_subscription:
        raise HTTPException(status_code=403, detail="Member has no active subscription")
    if (active_subscription.payment_status or "").strip().lower() != "paid":
        raise HTTPException(status_code=402, detail="Member subscription is not paid")
    # Check session quota before allowing check-in
    if active_subscription.session_count is not None and active_subscription.session_count > 0:
        used = count_subscription_sessions(db, active_subscription)
        if used >= active_subscription.session_count:
            expire_subscription(db, active_subscription)
            raise HTTPException(status_code=403, detail="Member has exhausted all sessions in this subscription")
    existing = get_today_attendance_for_member(db, data.member_id)
    if existing:
        raise HTTPException(status_code=409, detail="Member already checked in today")
    if data.duration_hours is not None and data.duration_hours <= 0:
        raise HTTPException(status_code=400, detail="Duration must be greater than zero")
    attendance = create_attendance(db, data)
    # After recording, expire subscription if this was the last session
    if active_subscription.session_count is not None and active_subscription.session_count > 0:
        used = count_subscription_sessions(db, active_subscription)
        if used >= active_subscription.session_count:
            expire_subscription(db, active_subscription)
    return serialize_attendance(attendance, member)
