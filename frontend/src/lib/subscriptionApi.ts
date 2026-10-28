import { getAuthHeaders } from './authApi';
import { API_BASE_URL } from './config';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_inr: number;
  duration_months?: number;
  duration_days: number;
  savings_inr?: number;
  features: Record<string, any>;
  is_popular?: boolean;
}

export interface CouponResult {
  is_valid: boolean;
  coupon_code: string;
  original_price_inr: number;
  discount_amount_inr: number;
  net_payable_inr: number;
  message: string;
  discount_type?: string;
  discount_percentage?: number;
}

export interface CheckoutResult {
  transaction_id: string;
  subscription_id: string;
  status: string;
  net_amount_inr: number;
  message: string;
  expires_at: string;
}

export interface SubscriptionStatus {
  is_active: boolean;
  plan_name?: string;
  plan_id?: string;
  starts_at?: string;
  expires_at?: string;
  days_remaining: number;
  features: Record<string, any>;
  recent_transactions?: Array<{
    id: string;
    amount_inr: number;
    discount_inr: number;
    net_amount_inr: number;
    status: string;
    created_at: string;
  }>;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${API_BASE_URL}/subscription/plans`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    return [
      {
        id: 'monthly',
        name: 'Monthly',
        price_inr: 200,
        duration_months: 1,
        duration_days: 30,
        savings_inr: 0,
        features: {
          unlimited_chat: true,
          view_contacts: true,
          who_viewed_me: true,
          priority_listing: true,
          verified_family_tag: true,
        },
      },
      {
        id: 'quarterly',
        name: 'Quarterly',
        price_inr: 500,
        duration_months: 3,
        duration_days: 90,
        savings_inr: 100,
        features: {
          unlimited_chat: true,
          view_contacts: true,
          who_viewed_me: true,
          priority_listing: true,
          verified_family_tag: true,
          save_amount: 100,
        },
        is_popular: true,
      },
      {
        id: 'half_yearly',
        name: 'Half-yearly',
        price_inr: 900,
        duration_months: 6,
        duration_days: 180,
        savings_inr: 300,
        features: {
          unlimited_chat: true,
          view_contacts: true,
          who_viewed_me: true,
          priority_listing: true,
          verified_family_tag: true,
          save_amount: 300,
        },
      },
    ];
  }
  return res.json();
}

export async function applyCoupon(code: string, planId: string): Promise<CouponResult> {
  const res = await fetch(`${API_BASE_URL}/subscription/coupon/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ code, plan_id: planId }),
  });
  if (!res.ok) throw new Error('Failed to validate coupon');
  return res.json();
}

export async function checkoutPlan(planId: string, couponCode?: string): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE_URL}/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ plan_id: planId, coupon_code: couponCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to process checkout' }));
    throw new Error(err.detail || 'Checkout failed');
  }
  return res.json();
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_BASE_URL}/subscription/my-status`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    return {
      is_active: false,
      days_remaining: 0,
      features: {},
    };
  }
  return res.json();
}
