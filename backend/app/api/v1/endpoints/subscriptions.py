from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User
from app.schemas.subscription import (
    SubscriptionPlanResponse,
    CouponApplyRequest,
    CouponApplyResponse,
    CheckoutRequest,
    CheckoutResponse,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyRequest,
    SubscriptionStatusResponse,
)
from app.services.subscription_service import subscription_service

router = APIRouter(prefix="/subscription", tags=["Subscriptions & Coupons"])


@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def get_subscription_plans(db: Session = Depends(get_db)):
    """List all available matrimonial membership plans."""
    return subscription_service.get_plans(db)


@router.post("/coupon/apply", response_model=CouponApplyResponse)
def apply_coupon(payload: CouponApplyRequest, db: Session = Depends(get_db)):
    """Validate community coupon code (e.g., BOR50) and calculate discount."""
    return subscription_service.apply_coupon(payload.code, payload.plan_id, db=db)


@router.post("/checkout/initiate", response_model=PaymentInitiateResponse)
def initiate_checkout(
    payload: PaymentInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiate a payment order with calculated discount."""
    return subscription_service.initiate_payment(
        user_id=current_user.id,
        plan_id=payload.plan_id,
        coupon_code=payload.coupon_code,
        db=db,
    )


@router.post("/checkout/verify", response_model=CheckoutResponse)
def verify_payment_and_activate(
    payload: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify payment and activate premium membership entitlement."""
    return subscription_service.verify_and_activate(
        user_id=current_user.id,
        plan_id=payload.plan_id,
        coupon_code=payload.coupon_code,
        order_id=payload.order_id,
        payment_id=payload.payment_id,
        db=db,
    )


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One-click checkout endpoint for activation with optional coupon."""
    return subscription_service.verify_and_activate(
        user_id=current_user.id,
        plan_id=payload.plan_id,
        coupon_code=payload.coupon_code,
        db=db,
    )


@router.get("/my-status", response_model=SubscriptionStatusResponse)
def get_my_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check current user's active plan, expiry, and unlocked features."""
    return subscription_service.get_user_status(current_user.id, db)
