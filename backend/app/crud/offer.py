from sqlalchemy.orm import Session
from app.models.offer import Offer
from app.schemas.offer import OfferCreate, OfferUpdate
from datetime import date


def get_offers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Offer).offset(skip).limit(limit).all()


def get_active_offers(db: Session):
    return (
        db.query(Offer)
        .filter(
            Offer.is_active == "true",
            Offer.start_date <= date.today(),
            Offer.end_date >= date.today(),
        )
        .all()
    )


def get_offer(db: Session, offer_id: int):
    return db.query(Offer).filter(Offer.id == offer_id).first()


def create_offer(db: Session, data: OfferCreate):
    offer = Offer(**data.model_dump())
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


def update_offer(db: Session, offer_id: int, data: OfferUpdate):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(offer, key, value)
    db.commit()
    db.refresh(offer)
    return offer


def delete_offer(db: Session, offer_id: int):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if offer:
        db.delete(offer)
        db.commit()
        return True
    return False
