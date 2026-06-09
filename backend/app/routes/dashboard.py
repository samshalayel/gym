from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta
from typing import Optional
from sqlalchemy import extract, func, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.member import get_member_count
from app.crud.subscription import (
    get_active_subscriptions_count,
    get_expired_subscriptions_count,
    get_revenue_summary,
)
from app.crud.equipment import get_equipment_needing_maintenance
from app.crud.subscription import is_subscription_due_on
from app.models.member import Member
from app.models.expense import Expense
from app.models.subscription import Subscription
from app.models.membership_plan import MembershipPlan

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


def month_range(day: date):
    start = day.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def dashboard_period_range(period: str, start_date: date = None, end_date: date = None):
    today = date.today()
    if period == "custom" and start_date and end_date:
        return start_date, end_date + timedelta(days=1)
    period = period if period in ("today", "month", "30d", "year", "all") else "30d"
    if period == "today":
        return today, today + timedelta(days=1)
    if period == "month":
        start, end = month_range(today)
        return start, end
    if period == "30d":
        return today - timedelta(days=29), today + timedelta(days=1)
    if period == "year":
        return today.replace(month=1, day=1), today + timedelta(days=1)
    return None, None


def members_in_period_query(db: Session, period: str, start_date: date = None, end_date: date = None):
    start, end = dashboard_period_range(period, start_date, end_date)
    query = db.query(Member)
    if start:
        query = query.filter(Member.created_at >= start)
    if end:
        query = query.filter(Member.created_at < end)
    return query


def monthly_member_growth(db: Session, months: int = 6):
    today = date.today()
    first = today.replace(day=1)
    starts = []
    for idx in range(months - 1, -1, -1):
        month = first.month - idx
        year = first.year
        while month <= 0:
            month += 12
            year -= 1
        starts.append(date(year, month, 1))
    items = []
    for start in starts:
        end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
        total = db.query(Member).filter(Member.created_at >= start, Member.created_at < end).count()
        items.append({"month": start.strftime("%Y-%m"), "total": total})
    return items


def member_trend(db: Session, period: str = "30d", start_date: date = None, end_date: date = None):
    today = date.today()
    if period == "custom" and start_date and end_date:
        days_count = (end_date - start_date).days + 1
        rows = (
            db.query(func.date(Member.created_at).label("day"), func.count(Member.id))
            .filter(Member.created_at >= start_date, Member.created_at <= end_date)
            .group_by(func.date(Member.created_at))
            .all()
        )
        counts = {str(day): total for day, total in rows}
        return {
            "period": "custom",
            "granularity": "day",
            "items": [
                {"label": (start_date + timedelta(days=idx)).isoformat(), "total": counts.get((start_date + timedelta(days=idx)).isoformat(), 0)}
                for idx in range(min(days_count, 90))
            ],
        }
    period = period if period in ("today", "month", "30d", "year", "all") else "30d"
    if period == "today":
        rows = (
            db.query(extract("hour", Member.created_at).label("hour"), func.count(Member.id))
            .filter(func.date(Member.created_at) == today.isoformat())
            .group_by(extract("hour", Member.created_at))
            .all()
        )
        counts = {int(hour): total for hour, total in rows}
        return {
            "period": period,
            "granularity": "hour",
            "items": [{"label": f"{hour:02d}:00", "total": counts.get(hour, 0)} for hour in range(24)],
        }

    if period in ("month", "30d"):
        start = today.replace(day=1) if period == "month" else today - timedelta(days=29)
        days_count = (today - start).days + 1
        rows = (
            db.query(func.date(Member.created_at).label("day"), func.count(Member.id))
            .filter(Member.created_at >= start)
            .group_by(func.date(Member.created_at))
            .all()
        )
        counts = {str(day): total for day, total in rows}
        return {
            "period": period,
            "granularity": "day",
            "items": [
                {"label": (start + timedelta(days=idx)).isoformat(), "total": counts.get((start + timedelta(days=idx)).isoformat(), 0)}
                for idx in range(days_count)
            ],
        }

    if period == "year":
        start = today.replace(month=1, day=1)
        rows = (
            db.query(extract("month", Member.created_at).label("month"), func.count(Member.id))
            .filter(Member.created_at >= start)
            .group_by(extract("month", Member.created_at))
            .all()
        )
        counts = {int(month): total for month, total in rows}
        return {
            "period": period,
            "granularity": "month",
            "items": [{"label": f"{today.year}-{month:02d}", "total": counts.get(month, 0)} for month in range(1, today.month + 1)],
        }

    rows = (
        db.query(
            extract("year", Member.created_at).label("year"),
            extract("month", Member.created_at).label("month"),
            func.count(Member.id),
        )
        .group_by(extract("year", Member.created_at), extract("month", Member.created_at))
        .order_by(extract("year", Member.created_at), extract("month", Member.created_at))
        .all()
    )
    return {
        "period": period,
        "granularity": "month",
        "items": [{"label": f"{int(year)}-{int(month):02d}", "total": total} for year, month, total in rows],
    }


def weekly_expected_members(db: Session):
    today = date.today()
    active_subs = (
        db.query(Subscription)
        .filter(
            Subscription.start_date <= today,
            Subscription.end_date >= today,
            func.lower(func.trim(Subscription.payment_status)) == "paid",
            or_(
                Subscription.renewal_status.notin_(["expired", "changed"]),
                Subscription.renewal_status.is_(None),
            ),
        )
        .all()
    )
    labels = ["mon", "tue", "wed", "thu", "sat", "sun"]
    day_offsets = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "sat": 5, "sun": 6}
    sample_week = today - timedelta(days=today.weekday())
    result = []
    for label in labels:
        day = sample_week + timedelta(days=day_offsets[label])
        total = sum(1 for sub in active_subs if is_subscription_due_on(sub, day))
        result.append({"day": label, "total": total})
    return result


def overpayment_summary(db: Session):
    rows = (
        db.query(Subscription, MembershipPlan)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .all()
    )
    total = 0
    amount = 0
    for sub, plan in rows:
        expected = max((plan.price or 0) - (sub.discount_amount or 0), 0)
        paid = sub.amount_paid or 0
        if paid > expected:
            total += 1
            amount += paid - expected
    return {"total": total, "amount": amount}


def debtors_summary(db: Session):
    rows = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
        .filter(Subscription.renewal_status.notin_(["changed"]))
        .all()
    )
    member_debts = {}
    for sub, plan, member in rows:
        expected = max((plan.price or 0) - (sub.discount_amount or 0), 0)
        paid = sub.amount_paid or 0
        remaining = expected - paid
        if remaining > 0:
            if member.id not in member_debts:
                member_debts[member.id] = {
                    "member_id": member.id,
                    "name": member.name,
                    "phone": member.phone,
                    "remaining": 0,
                }
            member_debts[member.id]["remaining"] += remaining
    items = sorted(member_debts.values(), key=lambda x: x["remaining"], reverse=True)
    return {"total": len(items), "amount": sum(i["remaining"] for i in items), "items": items}


@router.get("")
def dashboard(
    trend_period: str = Query("30d", pattern="^(today|month|30d|year|all|custom)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    today = date.today()
    month_start, next_month = month_range(today)
    period_start, period_end_exclusive = dashboard_period_range(trend_period, start_date, end_date)
    period_end_inclusive = period_end_exclusive - timedelta(days=1) if period_end_exclusive else None
    period_revenue = get_revenue_summary(db, start_date=period_start, end_date=period_end_inclusive)
    period_expenses = (
        db.query(func.sum(Expense.amount))
    )
    if period_start:
        period_expenses = period_expenses.filter(Expense.expense_date >= period_start)
    if period_end_exclusive:
        period_expenses = period_expenses.filter(Expense.expense_date < period_end_exclusive)
    period_expenses = period_expenses.scalar() or 0
    period_members_query = members_in_period_query(db, trend_period, start_date, end_date)
    gender_rows = period_members_query.with_entities(Member.gender, func.count(Member.id)).group_by(Member.gender).all()
    gender_chart = [{"gender": gender or "unknown", "total": total} for gender, total in gender_rows]
    overpayments = overpayment_summary(db)
    return {
        "total_members": period_members_query.count(),
        "active_subscriptions": get_active_subscriptions_count(db),
        "expired_subscriptions": get_expired_subscriptions_count(db),
        "total_revenue": get_revenue_summary(db),
        "monthly_revenue": period_revenue,
        "monthly_expenses": period_expenses,
        "equipment_needing_maintenance": len(get_equipment_needing_maintenance(db)),
        "unpaid_subscriptions": db.query(Subscription).filter(Subscription.payment_status != "paid").count(),
        "birthdays": upcoming_birthdays(db, days=2),
        "gender_chart": gender_chart,
        "member_growth": monthly_member_growth(db),
        "member_trend": member_trend(db, trend_period, start_date, end_date),
        "weekly_expected": weekly_expected_members(db),
        "overpayments": overpayments,
        "debtors": debtors_summary(db),
    }
