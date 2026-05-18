from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.offer import (
    get_offers,
    get_offer,
    get_active_offers,
    create_offer,
    update_offer,
    delete_offer,
)
from app.schemas.offer import OfferCreate, OfferUpdate, OfferResponse

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.get("")
def list_offers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    offers = get_offers(db, skip=skip, limit=limit)
    return {"total": len(offers), "items": offers}


@router.get("/active")
def active_offers(db: Session = Depends(get_db)):
    offers = get_active_offers(db)
    return {"total": len(offers), "items": offers}


@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer_detail(offer_id: int, db: Session = Depends(get_db)):
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.post("", response_model=OfferResponse, status_code=201)
def create_offer_endpoint(data: OfferCreate, db: Session = Depends(get_db)):
    return create_offer(db, data)


@router.put("/{offer_id}", response_model=OfferResponse)
def update_offer_endpoint(
    offer_id: int, data: OfferUpdate, db: Session = Depends(get_db)
):
    offer = update_offer(db, offer_id, data)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.delete("/{offer_id}")
def delete_offer_endpoint(offer_id: int, db: Session = Depends(get_db)):
    if not delete_offer(db, offer_id):
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deleted successfully"}
