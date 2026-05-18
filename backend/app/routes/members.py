from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.crud.member import (
    get_members,
    get_member,
    get_member_count,
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
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    members = get_members(db, skip=skip, limit=limit, search=search)
    total_count = get_member_count(db, search=search)
    member_ids_with_access = set(
        row[0]
        for row in db.query(User.member_id)
        .filter(User.role == "member", User.member_id.isnot(None))
        .all()
    )
    items = []
    for m in members:
        d = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        d["has_portal_access"] = m.id in member_ids_with_access
        items.append(d)
    return {"total": len(items), "total_count": total_count, "items": items}


@router.get("/{member_id}", response_model=MemberResponse)
def get_member_detail(member_id: int, db: Session = Depends(get_db)):
    member = get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
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
    username = member.name.lower().replace(" ", "_")[:20]
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1
    user = User(
        username=username,
        hashed_password=get_password_hash(f"{username}123"),
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
        "password": f"{username}123",
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
    if not delete_member(db, member_id):
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}
