from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta
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
from app.services.entitlement_service import entitlement_service


def to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


PLAN_ALIASES = {
    "monthly_premium": "monthly",
    "quarterly_gold": "quarterly",
    "annual_diamond": "half_yearly",
}


class SubscriptionService:
    def _normalize_plan_id(self, plan_id: str) -> str:
        return PLAN_ALIASES.get(plan_id, plan_id)

    @staticmethod
    def _parse_features(raw_features: Any) -> Dict[str, Any]:
        features = raw_features
        # Handle string or multi-encoded JSON strings
        while isinstance(features, str):
            try:
                parsed = json.loads(features)
                if parsed == features:
                    break
                features = parsed
            except Exception:
                break
        if not isinstance(features, dict):
            features = {}
        return dict(features)

    def get_plans(self, db: Session) -> List[SubscriptionPlanResponse]:
        plans = (
            db.query(SubscriptionPlan)
            .filter(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.duration_months.asc())
            .all()
        )
        results = []
        for p in plans:
            features = self._parse_features(p.features_json)
            results.append(
                SubscriptionPlanResponse(
                    id=p.id,
                    name=p.name,
                    price_inr=float(p.price_inr),
                    duration_months=p.duration_months or 1,
                    duration_days=p.duration_days or 30,
                    savings_inr=float(p.savings_inr or 0.0),
                    features=features,
                    is_popular="Most Popular" in str(features) or p.id == "quarterly",
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

        clean_plan_id = self._normalize_plan_id(plan_id)
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == clean_plan_id).first()
        if not plan:
            # Fallback lookup
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
            return CouponApplyResponse(
                is_valid=False,
                coupon_code=code_clean,
                original_price_inr=original_price,
                discount_amount_inr=0.00,
                net_payable_inr=original_price,
                message="Invalid or expired coupon code.",
            )

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
        plan_id: str = "monthly",
        coupon_code: Optional[str] = None,
        db: Session = None,
    ) -> PaymentInitiateResponse:
        clean_plan_id = self._normalize_plan_id(plan_id)
        coupon_res = self.apply_coupon(coupon_code, plan_id=clean_plan_id, db=db)
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == clean_plan_id).first() if db else None
        plan_name = plan.name if plan else "Monthly Plan"

        order_id = f"order_bk_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"

        return PaymentInitiateResponse(
            order_id=order_id,
            plan_id=clean_plan_id,
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
        plan_id: str = "monthly",
        coupon_code: Optional[str] = None,
        order_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        db: Session = None,
    ) -> CheckoutResponse:
        clean_plan_id = self._normalize_plan_id(plan_id)

        # Idempotency check: if order_id has already been processed successfully, return existing
        if db and order_id:
            existing_txn = (
                db.query(PaymentTransaction)
                .filter(PaymentTransaction.order_id == order_id, PaymentTransaction.status == "SUCCESS")
                .first()
            )
            if existing_txn:
                existing_sub = (
                    db.query(Subscription)
                    .filter(Subscription.user_id == user_id, Subscription.status == "ACTIVE")
                    .order_by(Subscription.expires_at.desc())
                    .first()
                )
                if existing_sub:
                    return CheckoutResponse(
                        transaction_id=existing_txn.id,
                        subscription_id=existing_sub.id,
                        status="ACTIVE",
                        net_amount_inr=float(existing_txn.net_amount_inr),
                        message="Payment verified! Subscription is active.",
                        expires_at=existing_sub.expires_at.isoformat(),
                    )

        coupon_res = self.apply_coupon(coupon_code, plan_id=clean_plan_id, db=db)
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == clean_plan_id).first() if db else None
        
        # Authoritative calendar-month arithmetic
        duration_months = plan.duration_months if (plan and plan.duration_months) else 1

        now = datetime.now(timezone.utc)
        expires_at = now + relativedelta(months=duration_months)

        # 1. Record payment transaction
        txn = PaymentTransaction(
            user_id=user_id,
            plan_id=clean_plan_id,
            order_id=order_id,
            payment_id=payment_id or f"pay_sim_{uuid.uuid4().hex[:10]}",
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
                # Extend existing active subscription by calendar months
                existing_sub.expires_at = existing_exp + relativedelta(months=duration_months)
                existing_sub.plan_id = clean_plan_id
                sub = existing_sub
                expires_at = existing_sub.expires_at
            else:
                new_sub = Subscription(
                    user_id=user_id,
                    plan_id=clean_plan_id,
                    status="ACTIVE",
                    starts_at=now,
                    expires_at=expires_at,
                )
                db.add(new_sub)
                sub = new_sub
            db.commit()

        sub_id = sub.id if sub else f"SUB-{user_id[:8]}"
        txn_id = txn.id if db else (order_id or f"TXN-{int(now.timestamp())}")

        month_label = f"{duration_months} month" if duration_months == 1 else f"{duration_months} months"
        return CheckoutResponse(
            transaction_id=txn_id,
            subscription_id=sub_id,
            status="ACTIVE",
            net_amount_inr=coupon_res.net_payable_inr,
            message=f"Premium entitlement activated for {month_label}! All profiles unlocked, direct chat enabled.",
            expires_at=expires_at.isoformat(),
        )

    def get_user_status(self, user_id: str, db: Session) -> SubscriptionStatusResponse:
        now = datetime.now(timezone.utc)
        
        # Use entitlement service to check and expire outdated subscriptions
        is_active = entitlement_service.is_user_subscribed(user_id, db)

        sub = None
        if is_active:
            sub = (
                db.query(Subscription)
                .filter(
                    Subscription.user_id == user_id,
                    Subscription.status == "ACTIVE",
                )
                .order_by(Subscription.expires_at.desc())
                .first()
            )

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

        if not sub or not is_active:
            return SubscriptionStatusResponse(
                is_active=False,
                days_remaining=0,
                features={
                    "unlimited_chat": False,
                    "view_all_profiles": False,
                    "view_contacts": False,
                    "who_viewed_me": False,
                },
                recent_transactions=txn_items,
            )

        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        sub_exp = to_utc(sub.expires_at)
        days_remaining = max(0, (sub_exp - now).days) if sub_exp else 0
        features = self._parse_features(plan.features_json) if plan else {}
        features["unlimited_chat"] = True
        features["view_all_profiles"] = True

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
