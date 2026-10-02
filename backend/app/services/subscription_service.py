from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import uuid

from app.models.entities import (
    SubscriptionPlan,
    Coupon,
    Subscription,
    PaymentTransaction,
    User,
)
from app.schemas.subscription import (
    SubscriptionPlanResponse,
    CouponApplyResponse,
    CheckoutResponse,
    PaymentInitiateResponse,
    SubscriptionStatusResponse,
    TransactionItem,
)


def to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class SubscriptionService:
    def get_plans(self, db: Session) -> List[SubscriptionPlanResponse]:
        plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
        results = []
        for p in plans:
            try:
                features = json.loads(p.features_json) if p.features_json else {}
            except Exception:
                features = {}
            results.append(
                SubscriptionPlanResponse(
                    id=p.id,
                    name=p.name,
                    price_inr=float(p.price_inr),
                    duration_days=p.duration_days,
                    features=features,
                    is_popular="Most Popular" in str(features),
                )
            )
        return results

    def apply_coupon(
        self,
        code: Optional[str],
        plan_id: str,
        db: Session,
    ) -> CouponApplyResponse:
        from fastapi import HTTPException
        
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found.")
            
        original_price = float(plan.price_inr)

        if not code or not code.strip():
            return CouponApplyResponse(
                is_valid=False,
                coupon_code="",
                original_price_inr=original_price,
                discount_amount_inr=0.00,
                net_payable_inr=original_price,
                message="No coupon code entered.",
            )

        code_clean = code.strip().upper()
        coupon = db.query(Coupon).filter(Coupon.code == code_clean, Coupon.is_active == True).first()

        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid or expired coupon code.")

        if coupon.discount_type == "PERCENTAGE":
            calc_discount = original_price * (float(coupon.discount_value) / 100.0)
            max_discount = float(coupon.max_discount_inr) if coupon.max_discount_inr else calc_discount
            discount = min(calc_discount, max_discount)
        else:
            discount = min(float(coupon.discount_value), original_price)

        net = max(0.00, original_price - discount)
        return CouponApplyResponse(
            is_valid=True,
            coupon_code=coupon.code,
            original_price_inr=original_price,
            discount_amount_inr=round(discount, 2),
            net_payable_inr=round(net, 2),
            message=f"Community coupon '{coupon.code}' applied! You save ₹{round(discount, 2):.0f}.",
        )

    def initiate_payment(
        self,
        user_id: str,
        plan_id: str = "monthly_premium",
        coupon_code: Optional[str] = None,
        db: Session = None,
    ) -> PaymentInitiateResponse:
        coupon_res = self.apply_coupon(coupon_code, plan_id=plan_id, db=db)
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first() if db else None
        plan_name = plan.name if plan else "Monthly Premium"

        order_id = f"order_bk_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"

        return PaymentInitiateResponse(
            order_id=order_id,
            plan_id=plan_id,
            plan_name=plan_name,
            amount_inr=coupon_res.original_price_inr,
            discount_inr=coupon_res.discount_amount_inr,
            net_amount_inr=coupon_res.net_payable_inr,
            currency="INR",
            key_id="rzp_live_borkonya_community",
        )

    def verify_and_activate(
        self,
        user_id: str,
        plan_id: str = "monthly_premium",
        coupon_code: Optional[str] = None,
        order_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        db: Session = None,
    ) -> CheckoutResponse:
        coupon_res = self.apply_coupon(coupon_code, plan_id=plan_id, db=db)
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first() if db else None
        duration_days = plan.duration_days if plan else 30

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=duration_days)

        # 1. Record payment transaction
        txn = PaymentTransaction(
            user_id=user_id,
            amount_inr=coupon_res.original_price_inr,
            discount_inr=coupon_res.discount_amount_inr,
            net_amount_inr=coupon_res.net_payable_inr,
            status="SUCCESS",
            created_at=now,
        )
        if db:
            db.add(txn)
            db.flush()

        # 2. Check for existing active subscription to extend, or create new
        sub = None
        if db:
            existing_sub = (
                db.query(Subscription)
                .filter(Subscription.user_id == user_id, Subscription.status == "ACTIVE")
                .first()
            )
            existing_exp = to_utc(existing_sub.expires_at) if existing_sub else None
            if existing_sub and existing_exp and existing_exp > now:
                # Extend existing subscription
                existing_sub.expires_at = existing_exp + timedelta(days=duration_days)
                existing_sub.plan_id = plan_id
                sub = existing_sub
            else:
                new_sub = Subscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    status="ACTIVE",
                    starts_at=now,
                    expires_at=expires_at,
                )
                db.add(new_sub)
                sub = new_sub
            db.commit()

        sub_id = sub.id if sub else f"SUB-{user_id[:8]}"
        txn_id = txn.id if db else (order_id or f"TXN-{int(now.timestamp())}")

        return CheckoutResponse(
            transaction_id=txn_id,
            subscription_id=sub_id,
            status="ACTIVE",
            net_amount_inr=coupon_res.net_payable_inr,
            message=f"Premium entitlement activated for {duration_days} days! Enjoy direct chat, contact reveals, and visitor analytics.",
            expires_at=expires_at.isoformat(),
        )

    def get_user_status(self, user_id: str, db: Session) -> SubscriptionStatusResponse:
        now = datetime.now(timezone.utc)
        subs = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.status == "ACTIVE",
            )
            .order_by(Subscription.expires_at.desc())
            .all()
        )

        sub = None
        for s in subs:
            exp = to_utc(s.expires_at)
            if exp and exp > now:
                sub = s
                break

        txns = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.user_id == user_id)
            .order_by(PaymentTransaction.created_at.desc())
            .limit(5)
            .all()
        )

        txn_items = [
            TransactionItem(
                id=t.id,
                amount_inr=float(t.amount_inr),
                discount_inr=float(t.discount_inr),
                net_amount_inr=float(t.net_amount_inr),
                status=t.status,
                created_at=t.created_at,
            )
            for t in txns
        ]

        if not sub:
            return SubscriptionStatusResponse(
                is_active=False,
                days_remaining=0,
                features={
                    "unlimited_chat": False,
                    "view_contacts": False,
                    "who_viewed_me": False,
                },
                recent_transactions=txn_items,
            )

        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        sub_exp = to_utc(sub.expires_at)
        days_remaining = max(0, (sub_exp - now).days) if sub_exp else 0
        features = {}
        if plan and plan.features_json:
            try:
                features = json.loads(plan.features_json)
            except Exception:
                features = {}

        return SubscriptionStatusResponse(
            is_active=True,
            plan_id=sub.plan_id,
            plan_name=plan.name if plan else "Premium Plan",
            starts_at=sub.starts_at,
            expires_at=sub.expires_at,
            days_remaining=days_remaining,
            features=features,
            recent_transactions=txn_items,
        )


subscription_service = SubscriptionService()
