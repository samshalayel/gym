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
from app.models.subscription import SubscriptionPayment
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionLifecycleRequest,
    SubscriptionUpdate,
    SubscriptionResponse,
    PaymentCollectRequest,
    FreezeRequest,
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
        payment_account_name=data.payment_account_name,
        payment_status=data.payment_status,
        renewal_status="active",
        training_days=data.training_days,
        time_slot=data.time_slot,
        training_type=data.training_type,
        notes=data.notes,
    )


def assert_payment_within_expected(db: Session, plan_id: int, discount_amount: float = 0, amount_paid: float = 0):
    plan = get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    expected = max((plan.price or 0) - (discount_amount or 0), 0)
    if (amount_paid or 0) > expected:
        raise HTTPException(status_code=400, detail="Amount exceeds required amount")


def add_initial_payment_if_needed(db: Session, sub: Subscription, collection_date: Optional[date] = None):
    if (sub.amount_paid or 0) <= 0:
        return
    existing_payment = (
        db.query(SubscriptionPayment)
        .filter(SubscriptionPayment.subscription_id == sub.id)
        .first()
    )
    if existing_payment:
        return
    # The payment is stamped with the ACTUAL collection date (money received),
    # not the subscription start date. Defaults to today so the revenue report's
    # date filter reflects when cash actually changed hands.
    db.add(SubscriptionPayment(
        subscription_id=sub.id,
        payment_date=collection_date or date.today(),
        amount=sub.amount_paid,
        payment_method=sub.payment_method,
        payment_account=sub.payment_account,
        notes="Initial payment",
    ))
    db.commit()


def payment_entries(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None):
    real_query = (
        db.query(SubscriptionPayment, Subscription, MembershipPlan, Member)
        .join(Subscription, SubscriptionPayment.subscription_id == Subscription.id)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
    )
    if start_date:
        real_query = real_query.filter(SubscriptionPayment.payment_date >= start_date)
    if end_date:
        real_query = real_query.filter(SubscriptionPayment.payment_date <= end_date)

    entries = []
    for payment, sub, plan, member in real_query.all():
        entries.append({
            "payment_date": payment.payment_date,
            "amount": payment.amount or 0,
            "payment_method": payment.payment_method or sub.payment_method or "unknown",
            "payment_account": payment.payment_account or sub.payment_account,
            "subscription": sub,
            "plan": plan,
            "member": member,
            "notes": payment.notes,
            "is_legacy": False,
        })

    legacy_query = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
        .filter(
            Subscription.amount_paid > 0,
            ~Subscription.id.in_(db.query(SubscriptionPayment.subscription_id)),
        )
    )
    if start_date:
        legacy_query = legacy_query.filter(Subscription.start_date >= start_date)
    if end_date:
        legacy_query = legacy_query.filter(Subscription.start_date <= end_date)
    for sub, plan, member in legacy_query.all():
        entries.append({
            "payment_date": sub.start_date,
            "amount": sub.amount_paid or 0,
            "payment_method": sub.payment_method or "unknown",
            "payment_account": sub.payment_account,
            "subscription": sub,
            "plan": plan,
            "member": member,
            "notes": sub.notes,
            "is_legacy": True,
        })
    return entries


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


@router.get("/export-details")
def export_subscription_details(
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Return every subscription row with full member + plan info for Excel export."""
    items = []
    for entry in sorted(payment_entries(db, start_date, end_date), key=lambda item: item["payment_date"], reverse=True):
        sub = entry["subscription"]
        plan = entry["plan"]
        member = entry["member"]
        expected  = max((plan.price or 0) - (sub.discount_amount or 0), 0)
        remaining = max(expected - (sub.amount_paid or 0), 0)
        items.append({
            "member_name":    member.name,
            "member_phone":   member.phone,
            "plan_name":      plan.name,
            "start_date":     str(sub.start_date),
            "end_date":       str(sub.end_date),
            "payment_date":    str(entry["payment_date"]),
            "amount_paid":    entry["amount"],
            "discount":       sub.discount_amount or 0,
            "expected":       expected,
            "remaining":      remaining,
            "payment_status": sub.payment_status,
            "payment_method": entry["payment_method"] or "",
            "renewal_status": sub.renewal_status,
            "notes":          entry["notes"] or "",
        })
    return {"total": len(items), "items": items}


@router.get("/revenue-report")
def revenue_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    entries = payment_entries(db, start_date, end_date)
    subscription_rows = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
    )
    if start_date:
        subscription_rows = subscription_rows.filter(Subscription.end_date >= start_date)
    if end_date:
        subscription_rows = subscription_rows.filter(Subscription.start_date <= end_date)
    rows = subscription_rows.all()

    total_revenue = sum(entry["amount"] for entry in entries)
    total_expected = sum(
        max((r.MembershipPlan.price or 0) - (r.Subscription.discount_amount or 0), 0)
        for r in rows
    )
    # Outstanding debt must be the REAL per-subscription balance (expected - amount_paid),
    # NOT (expected - period_revenue). Payments made before the filter window still count
    # toward each subscription's balance, so fully-paid subs show zero remaining.
    total_remaining = sum(
        max(
            (r.MembershipPlan.price or 0)
            - (r.Subscription.discount_amount or 0)
            - (r.Subscription.amount_paid or 0),
            0,
        )
        for r in rows
    )

    paid_count    = sum(1 for r in rows if r.Subscription.payment_status == "paid")
    partial_count = sum(1 for r in rows if r.Subscription.payment_status == "partial")
    unpaid_count  = sum(1 for r in rows if r.Subscription.payment_status == "unpaid")

    by_month: dict = {}
    for entry in entries:
        key = entry["payment_date"].strftime("%Y-%m")
        if key not in by_month:
            by_month[key] = {"month": key, "revenue": 0, "count": 0}
        by_month[key]["revenue"] += entry["amount"]
        by_month[key]["count"] += 1

    by_plan: dict = {}
    for entry in entries:
        key = entry["plan"].name
        if key not in by_plan:
            by_plan[key] = {"plan": key, "revenue": 0, "count": 0}
        by_plan[key]["revenue"] += entry["amount"]
        by_plan[key]["count"] += 1

    by_method: dict = {}
    for entry in entries:
        key = entry["payment_method"] or "unknown"
        if key not in by_method:
            by_method[key] = {"method": key, "revenue": 0, "count": 0}
        by_method[key]["revenue"] += entry["amount"]
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

        # Auto-fix: only if money was actually collected AND covers the full amount
        if expected > 0 and (sub.amount_paid or 0) >= expected:
            sub.payment_status = "paid"
            needs_commit = True
            continue
        # Skip free plans (expected = 0) — don't auto-mark, let user decide
        if expected <= 0:
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


@router.get("/overpayments")
def overpaid_subscriptions(db: Session = Depends(get_db)):
    rows = (
        db.query(Subscription, MembershipPlan, Member)
        .join(MembershipPlan, Subscription.plan_id == MembershipPlan.id)
        .join(Member, Subscription.member_id == Member.id)
        .all()
    )
    items = []
    for sub, plan, member in rows:
        expected = max((plan.price or 0) - (sub.discount_amount or 0), 0)
        paid = sub.amount_paid or 0
        if paid <= expected:
            continue
        items.append({
            "id": sub.id,
            "member_id": sub.member_id,
            "member_name": member.name,
            "member_phone": member.phone,
            "plan_name": plan.name,
            "start_date": sub.start_date,
            "end_date": sub.end_date,
            "expected_amount": expected,
            "amount_paid": paid,
            "overpaid_amount": paid - expected,
            "payment_status": sub.payment_status,
        })
    return {"total": len(items), "items": items}


@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription_detail(sub_id: int, db: Session = Depends(get_db)):
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.get("/{sub_id}/payments")
def get_subscription_payments(sub_id: int, db: Session = Depends(get_db)):
    if not get_subscription(db, sub_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    items = (
        db.query(SubscriptionPayment)
        .filter(SubscriptionPayment.subscription_id == sub_id)
        .order_by(SubscriptionPayment.payment_date.desc(), SubscriptionPayment.id.desc())
        .all()
    )
    if not items:
        sub = get_subscription(db, sub_id)
        if sub and (sub.amount_paid or 0) > 0:
            return {
                "total": 1,
                "items": [{
                    "id": 0,
                    "subscription_id": sub.id,
                    "payment_date": sub.start_date,
                    "amount": sub.amount_paid,
                    "payment_method": sub.payment_method,
                    "payment_account": sub.payment_account,
                    "notes": "Initial payment",
                    "created_at": sub.created_at,
                }],
            }
    return {"total": len(items), "items": items}


@router.post("", response_model=SubscriptionResponse, status_code=201)
def create_subscription_endpoint(
    data: SubscriptionCreate, db: Session = Depends(get_db)
):
    existing = get_member_active_subscription(db, data.member_id)
    if existing:
        raise HTTPException(status_code=409, detail="Member already has an active subscription")
    assert_payment_within_expected(db, data.plan_id, data.discount_amount, data.amount_paid)
    sub = create_subscription(db, data)
    add_initial_payment_if_needed(db, sub, data.collection_date)
    activate_member(db, data.member_id)
    return sub


@router.post("/renew", response_model=SubscriptionResponse, status_code=201)
def renew_subscription_endpoint(
    data: SubscriptionLifecycleRequest, db: Session = Depends(get_db)
):
    assert_payment_within_expected(db, data.plan_id, data.discount_amount, data.amount_paid)
    latest = get_member_latest_subscription(db, data.member_id)
    today = date.today()
    # Honor a manually-chosen renewal start date; otherwise resume after the latest sub.
    if data.start_date is not None:
        start_date = data.start_date
    elif latest and latest.end_date >= today:
        start_date = latest.end_date + timedelta(days=1)
    else:
        start_date = today
    sub = create_subscription(db, build_subscription_payload(data, start_date, db))
    add_initial_payment_if_needed(db, sub, data.collection_date)
    activate_member(db, data.member_id)
    return sub


@router.post("/change-plan", response_model=SubscriptionResponse, status_code=201)
def change_subscription_plan_endpoint(
    data: SubscriptionLifecycleRequest, db: Session = Depends(get_db)
):
    assert_payment_within_expected(db, data.plan_id, data.discount_amount, data.amount_paid)
    today = date.today()
    current = get_member_active_subscription(db, data.member_id)
    payload = build_subscription_payload(data, today, db)

    if current and current.start_date >= today:
        # Same-day change: update in place, keep as active
        for key, value in payload.model_dump().items():
            if key == "collection_date":
                continue  # transient, not a model column
            setattr(current, key, value)
        db.commit()
        db.refresh(current)
        add_initial_payment_if_needed(db, current, data.collection_date)
        activate_member(db, data.member_id)
        return current

    if current:
        # Close the current subscription and create a new one
        current.end_date = today - timedelta(days=1)
        current.renewal_status = "changed"
        db.commit()

    sub = create_subscription(db, payload)
    add_initial_payment_if_needed(db, sub, data.collection_date)
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
    remaining_before = max(expected - (sub.amount_paid or 0), 0)
    if expected > 0 and data.amount > remaining_before:
        raise HTTPException(status_code=400, detail="Amount exceeds remaining balance")

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

    payment = SubscriptionPayment(
        subscription_id=sub.id,
        payment_date=data.payment_date or date.today(),
        amount=data.amount,
        payment_method=data.payment_method or sub.payment_method,
        payment_account=data.payment_account or sub.payment_account,
        notes=data.notes,
    )
    db.add(payment)

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
    existing = get_subscription(db, sub_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription not found")
    incoming = data.model_dump(exclude_unset=True)
    plan_id = incoming.get("plan_id", existing.plan_id)
    discount_amount = incoming.get("discount_amount", existing.discount_amount)
    amount_paid = incoming.get("amount_paid", existing.amount_paid)
    assert_payment_within_expected(db, plan_id, discount_amount, amount_paid)
    sub = update_subscription(db, sub_id, data)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.post("/{sub_id}/freeze")
def freeze_subscription_endpoint(sub_id: int, data: FreezeRequest, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    member = db.query(Member).filter(Member.id == sub.member_id).first()
    today = date.today()

    if data.freeze:
        if sub.frozen_at is not None:
            raise HTTPException(status_code=400, detail="Subscription is already frozen")
        sub.frozen_at = today
        if member and member.status not in ("canceled",):
            member.status = "frozen"
    else:
        if sub.frozen_at is None:
            raise HTTPException(status_code=400, detail="Subscription is not frozen")
        days_frozen = (today - sub.frozen_at).days
        if days_frozen > 0:
            sub.end_date = sub.end_date + timedelta(days=days_frozen)
        sub.frozen_at = None
        # Restore member status based on subscription
        if member and member.status == "frozen":
            payment = (sub.payment_status or "").strip().lower()
            if sub.end_date >= today and payment == "paid":
                member.status = "active"
            else:
                member.status = "expired"

    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "frozen": data.freeze,
        "frozen_at": sub.frozen_at,
        "end_date": sub.end_date,
        "member_status": member.status if member else None,
    }


@router.delete("/{sub_id}")
def delete_subscription_endpoint(sub_id: int, db: Session = Depends(get_db)):
    if not delete_subscription(db, sub_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted successfully"}
