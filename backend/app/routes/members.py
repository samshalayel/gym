from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.crud.member import (
    get_members,
    get_member,
    get_member_count,
    computed_member_status,
    create_member,
    update_member,
    delete_member,
)
from app.schemas.member import MemberCreate, MemberUpdate, MemberResponse
from app.models.user import User
from app.auth.auth import get_password_hash

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("")
def list_members(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # Status is derived from the latest active subscription/payment, so filter after computation.
    raw_members = get_members(db, skip=0, limit=10000, search=search, status=None)
    member_ids_with_access = set(
        row[0]
        for row in db.query(User.member_id)
        .filter(User.role == "member", User.member_id.isnot(None))
        .all()
    )
    items = []
    for m in raw_members:
        d = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        d["status"] = computed_member_status(db, m)
        if status and status != "all" and d["status"] != status:
            continue
        d["has_portal_access"] = m.id in member_ids_with_access
        items.append(d)
    paged_items = items[skip: skip + limit]
    return {"total": len(paged_items), "total_count": len(items), "items": paged_items}


@router.get("/{member_id}", response_model=MemberResponse)
def get_member_detail(member_id: int, db: Session = Depends(get_db)):
    member = get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.status = computed_member_status(db, member)
    return member


@router.post("/{member_id}/portal-access")
def toggle_portal_access(member_id: int, db: Session = Depends(get_db)):
    member = get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    existing = (
        db.query(User)
        .filter(User.member_id == member_id, User.role == "member")
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Portal access revoked", "has_portal_access": False}
    import secrets
    # Username = the member's 5-digit code (easy to type, unique, no Arabic).
    username = member.member_code or str(member.id)
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}-{counter}"
        counter += 1
    # Password = 5 random easy-to-read alphanumeric chars (no ambiguous 0/o/1/l/i).
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
    password = "".join(secrets.choice(alphabet) for _ in range(5))
    user = User(
        username=username,
        hashed_password=get_password_hash(password),
        email=member.email,
        role="member",
        member_id=member.id,
    )
    db.add(user)
    db.commit()
    return {
        "message": "Portal access granted",
        "has_portal_access": True,
        "username": username,
        "password": password,
    }


@router.post("", response_model=MemberResponse, status_code=201)
def create_member_endpoint(data: MemberCreate, db: Session = Depends(get_db)):
    return create_member(db, data)


@router.put("/{member_id}", response_model=MemberResponse)
def update_member_endpoint(
    member_id: int, data: MemberUpdate, db: Session = Depends(get_db)
):
    member = update_member(db, member_id, data)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.delete("/{member_id}")
def delete_member_endpoint(member_id: int, db: Session = Depends(get_db)):
    from datetime import date
    from app.models.subscription import Subscription
    # Block deletion while the member still has a running subscription.
    active = (
        db.query(Subscription)
        .filter(
            Subscription.member_id == member_id,
            Subscription.start_date <= date.today(),
            Subscription.end_date >= date.today(),
            Subscription.renewal_status.notin_(["expired", "changed"]),
        )
        .first()
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail="active_subscription",
        )
    try:
        result = delete_member(db, member_id)
        if not result:
            raise HTTPException(status_code=404, detail="Member not found")
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Member has linked records and could not be deleted",
        )
    if result == "archived":
        return {"message": "Member archived. Financial history was kept.", "action": "archived"}
    return {"message": "Member deleted successfully", "action": "deleted"}
