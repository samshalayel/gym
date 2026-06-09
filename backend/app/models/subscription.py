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
    session_count = Column(Integer, nullable=True)
    payment_method = Column(String(50))
    payment_account = Column(String(100))
    payment_account_name = Column(String(100))
    payment_status = Column(String(20), default=PaymentStatus.unpaid.value)
    renewal_status = Column(String(20), default="pending")
    training_days = Column(String(30), default="all")
    time_slot = Column(String(10))          # e.g. "06:00" = the 06:00–07:00 hour
    training_type = Column(String(20))      # "weights" (حديد) | "fitness" (لياقة)
    notes = Column(String(255))
    frozen_at = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", backref="subscriptions")
    plan = relationship("MembershipPlan", backref="subscriptions")
    offer = relationship("Offer", backref="subscriptions")


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    payment_date = Column(Date, server_default=func.current_date(), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50))
    payment_account = Column(String(100))
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    subscription = relationship("Subscription", backref="payments")
