from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    paid = "paid"
    unpaid = "unpaid"
    partial = "partial"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("membership_plans.id"), nullable=False)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    amount_paid = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    payment_status = Column(String(20), default=PaymentStatus.unpaid.value)
    renewal_status = Column(String(20), default="pending")
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="subscriptions")
    plan = relationship("MembershipPlan", backref="subscriptions")
    offer = relationship("Offer", backref="subscriptions")
