from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional
import calendar
from app.database import get_db
from app.crud.subscription import (
    get_subscriptions,
    get_subscription,
    get_member_subscriptions,
    get_member_latest_subscription,
    get_subscription_count,
    create_subscription,
    update_subscription,
    delete_subscription,
    get_member_active_subscription,
    activate_member,
)
from app.crud.membership_plan import get_plan
from app.models.subscription import Subscription
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionLifecycleRequest,
    SubscriptionUpdate,
    SubscriptionResponse,
    PaymentCollectRequest,
)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


def add_months(value: date, months: int):
    month = value.month - 1 + int(months or 1)
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def build_subscription_payload(data: SubscriptionLifecycleRequest, start_date: date, db: Session):
    plan = get_plan(db, data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return SubscriptionCreate(
        member_id=data.member_id,
        plan_id=data.plan_id,
        offer_id=data.offer_id,
        start_date=start_date,
        end_date=add_months(start_date, plan.duration_months),
        amount_paid=data.amount_paid,
        discount_amount=data.discount_amount,
        session_count=data.session_count if data.session_count is not None else plan.session_count,
        payment_method=data.payment_method,
        payment_account=data.payment_account,
        payment_status=data.payment_status,
        renewal_status="active",
        training_days=data.training_days,
        notes=data.notes,
    )


@router.get("")
def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    subs = get_subscriptions(db, skip=skip, limit=limit)
    total_count = get_subscription_count(db)
    return {"total": len(subs), "total_count": total_count, "items": subs}


@router.get("/by-member/{member_id}")
def member_subscriptions(member_id: int, db: Session = Depends(get_db)):
    subs = get_member_subscriptions(db, member_id)
    return {"total": len(subs), "items": subs}


@router.get("/revenue-report")
def revenue_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
    )
    if start_date:
        query = query.filter(Subscription.start_date >= start_date)
    if end_date:
        query = query.filter(Subscription.start_date <= end_date)

    rows = query.all()

    total_revenue = sum(r.Subscription.amount_paid or 0 for r in rows)
    total_expected = sum(
        max((r.MembershipPlan.price or 0) - (r.Subscription.discount_amount or 0), 0)
        for r in rows
    )
    total_remaining = max(total_expected - total_revenue, 0)

    paid_count    = sum(1 for r in rows if r.Subscription.payment_status == "paid")
    partial_count = sum(1 for r in rows if r.Subscription.payment_status == "partial")
    unpaid_count  = sum(1 for r in rows if r.Subscription.payment_status == "unpaid")

    by_month: dict = {}
    for r in rows:
        key = r.Subscription.start_date.strftime("%Y-%m")
        if key not in by_month:
            by_month[key] = {"month": key, "revenue": 0, "count": 0}
        by_month[key]["revenue"] += r.Subscription.amount_paid or 0
        by_month[key]["count"] += 1

    by_plan: dict = {}
    for r in rows:
        key = r.MembershipPlan.name
        if key not in by_plan:
            by_plan[key] = {"plan": key, "revenue": 0, "count": 0}
        by_plan[key]["revenue"] += r.Subscription.amount_paid or 0
        by_plan[key]["count"] += 1

    by_method: dict = {}
    for r in rows:
        key = r.Subscription.payment_method or "unknown"
        if key not in by_method:
            by_method[key] = {"method": key, "revenue": 0, "count": 0}
        by_method[key]["revenue"] += r.Subscription.amount_paid or 0
        by_method[key]["count"] += 1

    return {
        "total_revenue": total_revenue,
        "total_expected": total_expected,
        "total_remaining": total_remaining,
        "paid_count": paid_count,
        "partial_count": partial_count,
        "unpaid_count": unpaid_count,
        "total_count": len(rows),
        "by_month": sorted(by_month.values(), key=lambda x: x["month"]),
        "by_plan": sorted(by_plan.values(), key=lambda x: -x["revenue"]),
        "by_method": sorted(by_method.values(), key=lambda x: -x["revenue"]),
    }


@router.get("/pending-payments")
def pending_payments(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
        .filter(Subscription.payment_status.in_(["unpaid", "partial"]))
    )
    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%") | Member.phone.ilike(f"%{search}%")
        )
    rows = query.order_by(Subscription.start_date.desc()).all()

    items = []
    needs_commit = False
    for sub, plan, member in rows:
        expected  = max((plan.price or 0) - (sub.discount_amount or 0), 0)
        remaining = max(expected - (sub.amount_paid or 0), 0)

        # Auto-fix: mark as paid if nothing is left
        if remaining <= 0:
            sub.payment_status = "paid"
            needs_commit = True
            continue

        items.append({
            "id": sub.id,
            "member_id": sub.member_id,
            "member_name": member.name,
            "member_phone": member.phone,
            "plan_name": plan.name,
            "plan_price": plan.price,
            "start_date": sub.start_date,
            "end_date": sub.end_date,
            "amount_paid": sub.amount_paid or 0,
            "discount_amount": sub.discount_amount or 0,
            "expected_amount": expected,
            "remaining_amount": remaining,
            "payment_status": sub.payment_status,
            "payment_method": sub.payment_method,
            "renewal_status": sub.renewal_status,
        })

    if needs_commit:
        db.commit()

    return {"total": len(items), "items": items}


@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription_detail(sub_id: int, db: Session = Depends(get_db)):
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.post("", response_model=SubscriptionResponse, status_code=201)
def create_subscription_endpoint(
    data: SubscriptionCreate, db: Session = Depends(get_db)
):
    existing = get_member_active_subscription(db, data.member_id)
    if existing:
        raise HTTPException(status_code=409, detail="Member already has an active subscription")
    sub = create_subscription(db, data)
    activate_member(db, data.member_id)
    return sub


@router.post("/renew", response_model=SubscriptionResponse, status_code=201)
def renew_subscription_endpoint(
    data: SubscriptionLifecycleRequest, db: Session = Depends(get_db)
):
    latest = get_member_latest_subscription(db, data.member_id)
    today = date.today()
    if latest and latest.end_date >= today:
        start_date = latest.end_date + timedelta(days=1)
    else:
        start_date = today
    sub = create_subscription(db, build_subscription_payload(data, start_date, db))
    activate_member(db, data.member_id)
    return sub


@router.post("/change-plan", response_model=SubscriptionResponse, status_code=201)
def change_subscription_plan_endpoint(
    data: SubscriptionLifecycleRequest, db: Session = Depends(get_db)
):
    today = date.today()
    current = get_member_active_subscription(db, data.member_id)
    payload = build_subscription_payload(data, today, db)

    if current and current.start_date >= today:
        # Same-day change: update in place, keep as active
        for key, value in payload.model_dump().items():
            setattr(current, key, value)
        db.commit()
        db.refresh(current)
        activate_member(db, data.member_id)
        return current

    if current:
        # Close the current subscription and create a new one
        current.end_date = today - timedelta(days=1)
        current.renewal_status = "changed"
        db.commit()

    sub = create_subscription(db, payload)
    activate_member(db, data.member_id)
    return sub


@router.post("/{sub_id}/collect-payment")
def collect_payment(
    sub_id: int,
    data: PaymentCollectRequest,
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == sub.plan_id).first()
    expected = max((plan.price or 0) - (sub.discount_amount or 0), 0) if plan else 0

    new_paid = (sub.amount_paid or 0) + data.amount
    if expected > 0:
        new_paid   = min(new_paid, expected)
        new_status = "paid" if new_paid >= expected else "partial"
    else:
        new_status = "paid"

    sub.amount_paid    = new_paid
    sub.payment_status = new_status
    if data.payment_method:
        sub.payment_method = data.payment_method
    if data.payment_account:
        sub.payment_account = data.payment_account
    if data.notes:
        sub.notes = f"{sub.notes} | {data.notes}" if sub.notes else data.notes

    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "amount_paid": sub.amount_paid,
        "payment_status": sub.payment_status,
        "payment_method": sub.payment_method,
        "remaining": max(expected - sub.amount_paid, 0),
    }


@router.put("/{sub_id}", response_model=SubscriptionResponse)
def update_subscription_endpoint(
    sub_id: int, data: SubscriptionUpdate, db: Session = Depends(get_db)
):
    sub = update_subscription(db, sub_id, data)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.delete("/{sub_id}")
def delete_subscription_endpoint(sub_id: int, db: Session = Depends(get_db)):
    if not delete_subscription(db, sub_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted successfully"}
