from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    price_inr: float
    duration_days: int
    features: Dict[str, Any]
    is_popular: bool = False


class CouponApplyRequest(BaseModel):
    code: str
    plan_id: str = "monthly_premium"


class CouponApplyResponse(BaseModel):
    is_valid: bool
    coupon_code: str
    original_price_inr: float
    discount_amount_inr: float
    net_payable_inr: float
    message: str


class CheckoutRequest(BaseModel):
    plan_id: str = "monthly_premium"
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = "UPI"


class CheckoutResponse(BaseModel):
    transaction_id: str
    subscription_id: str
    status: str
    net_amount_inr: float
    message: str
    expires_at: str


class PaymentInitiateRequest(BaseModel):
    plan_id: str = "monthly_premium"
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = "UPI"


class PaymentInitiateResponse(BaseModel):
    order_id: str
    plan_id: str
    plan_name: str
    amount_inr: float
    discount_inr: float
    net_amount_inr: float
    currency: str = "INR"
    key_id: Optional[str] = "borkonya_live_key"


class PaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    payment_signature: Optional[str] = None
    plan_id: str
    coupon_code: Optional[str] = None


class TransactionItem(BaseModel):
    id: str
    amount_inr: float
    discount_inr: float
    net_amount_inr: float
    status: str
    created_at: datetime


class SubscriptionStatusResponse(BaseModel):
    is_active: bool
    plan_name: Optional[str] = None
    plan_id: Optional[str] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    days_remaining: int = 0
    features: Dict[str, Any] = {}
    recent_transactions: List[TransactionItem] = []
