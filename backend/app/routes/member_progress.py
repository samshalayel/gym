from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud.member import get_member
from app.crud.member_progress import (
    create_member_progress,
    delete_member_progress,
    get_member_progress,
    update_member_progress,
)
from app.database import get_db
from app.schemas.member_progress import MemberProgressCreate, MemberProgressResponse, MemberProgressUpdate

router = APIRouter(prefix="/api/member-progress", tags=["member-progress"])


@router.get("/by-member/{member_id}")
def list_member_progress(member_id: int, db: Session = Depends(get_db)):
    member = get_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    items = get_member_progress(db, member_id)
    return {"total": len(items), "member": member, "items": items}


@router.post("", response_model=MemberProgressResponse, status_code=201)
def create_member_progress_endpoint(data: MemberProgressCreate, db: Session = Depends(get_db)):
    member = get_member(db, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if data.weight_kg is None and data.muscle_size_cm is None and not data.notes:
        raise HTTPException(status_code=400, detail="Add weight, muscle size, or notes")
    return create_member_progress(db, data)


@router.put("/{entry_id}", response_model=MemberProgressResponse)
def update_member_progress_endpoint(
    entry_id: int,
    data: MemberProgressUpdate,
    db: Session = Depends(get_db),
):
    entry = update_member_progress(db, entry_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Progress entry not found")
    return entry


@router.delete("/{entry_id}")
def delete_member_progress_endpoint(entry_id: int, db: Session = Depends(get_db)):
    if not delete_member_progress(db, entry_id):
        raise HTTPException(status_code=404, detail="Progress entry not found")
    return {"message": "Progress entry deleted successfully"}
