import React, { useState, useEffect } from 'react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import {
  Sparkles,
  Check,
  Tag,
  CreditCard,
  CheckCircle2,
  Lock,
  Shield,
  Zap,
  Star,
  RefreshCw,
  QrCode,
  Clock,
} from 'lucide-react';
import {
  getSubscriptionPlans,
  applyCoupon,
  checkoutPlan,
  getSubscriptionStatus,
} from '../lib/subscriptionApi';
import type {
  SubscriptionPlan,
  CouponResult,
  CheckoutResult,
  SubscriptionStatus,
} from '../lib/subscriptionApi';

export const SubscriptionPage: React.FC = () => {
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly_premium');
  const [couponCode, setCouponCode] = useState('BOR50');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Checkout modal & payment state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('member@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  // Active status
  const [userStatus, setUserStatus] = useState<SubscriptionStatus | null>(null);

  // 1. Load plans and existing subscription status
  useEffect(() => {
    getSubscriptionPlans()
      .then((data) => {
        setPlans(data);
        if (data.length > 0) {
          const pop = data.find((p) => p.is_popular);
          setSelectedPlanId(pop ? pop.id : data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load plans:', err));

    getSubscriptionStatus()
      .then((status) => {
        setUserStatus(status);
      })
      .catch(() => {});
  }, []);


  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || {
    id: 'monthly_premium',
    name: 'Monthly Premium',
    price_inr: 200,
    duration_days: 30,
    features: {},
  };

  // 2. Handle Coupon Validation
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const res = await applyCoupon(couponCode, selectedPlanId);
      if (res.is_valid) {
        setCouponResult(res);
        setCouponError('');
      } else {
        setCouponResult(null);
        setCouponError(res.message || 'Invalid coupon code. Try BOR50.');
      }
    } catch (err: any) {
      setCouponError('Failed to apply coupon. Try BOR50.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Calculate pricing
  const basePrice = selectedPlan.price_inr;
  const discount = couponResult && couponResult.is_valid ? couponResult.discount_amount_inr : 0;
  const netPayable = Math.max(0, basePrice - discount);

  // 3. Process Live Checkout & Entitlement Activation
  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      const result = await checkoutPlan(
        selectedPlanId,
        couponResult?.is_valid ? couponResult.coupon_code : undefined
      );
      setCheckoutResult(result);
      setCheckoutModalOpen(false);

      // Refresh subscription status
      const updatedStatus = await getSubscriptionStatus();
      setUserStatus(updatedStatus);
    } catch (err: any) {
      alert(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />

      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-10 w-full">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-1.5 rounded-full bg-crimson-50 px-3.5 py-1 text-xs font-bold text-crimson-900 mb-3 border border-crimson-200 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-crimson-700" />
            <span>Dedicated Community Matrimonial Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-navy-950 font-serif tracking-tight">
            Transparent, Dignified Matrimonial Plans
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            BorKonya offers family-friendly, affordable matrimonial plans starting at just{' '}
            <strong className="text-navy-950">₹200/month</strong> (₹100 with community code{' '}
            <span className="font-mono bg-crimson-100 text-crimson-900 px-1.5 py-0.5 rounded font-bold">
              BOR50
            </span>
            ).
          </p>
        </div>

        {/* Active Subscription Banner if Member has Active Plan */}
        {userStatus && userStatus.is_active && !checkoutResult && (
          <div className="mb-10 rounded-3xl bg-gradient-to-r from-navy-950 to-navy-900 text-white p-6 sm:p-8 shadow-xl border border-navy-700 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-crimson-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Active Premium Member</span>
              </div>
              <h2 className="text-2xl font-serif font-bold">{userStatus.plan_name || 'Premium Plan'}</h2>
              <p className="text-xs text-slate-200">
                All features unlocked: Unlimited in-app chat, direct verified contact view, and visitor analytics.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
              <Clock className="w-8 h-8 text-crimson-300 flex-shrink-0" />
              <div>
                <span className="text-2xl font-black">{userStatus.days_remaining}</span>
                <span className="text-xs text-slate-200 block font-medium">Days Remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* Post-Purchase Success Banner */}
        {checkoutResult && (
          <div className="rounded-3xl bg-white p-8 sm:p-12 text-center shadow-xl border border-emerald-200 max-w-xl mx-auto mb-10 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-navy-950 font-serif">
              Membership Activated Successfully!
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {checkoutResult.message}
            </p>
            <div className="mt-5 p-3 rounded-2xl bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 space-y-1">
              <div>
                Transaction ID: <span className="font-mono text-navy-950">{checkoutResult.transaction_id}</span>
              </div>
              <div>
                Net Amount Billed: <span className="font-bold text-emerald-700">₹{checkoutResult.net_amount_inr}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <a
                href="/matches"
                className="px-6 py-2.5 bg-navy-950 text-white rounded-xl text-xs font-bold hover:bg-navy-900 transition-colors"
              >
                Browse Compatible Matches &rarr;
              </a>
              <a
                href="/messages"
                className="px-6 py-2.5 bg-crimson-700 text-white rounded-xl text-xs font-bold hover:bg-crimson-800 transition-colors"
              >
                Open Family Messages
              </a>
            </div>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            const isPopular = plan.is_popular || plan.id === 'quarterly_gold';

            return (
              <div
                key={plan.id}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  if (couponResult) {
                    applyCoupon(couponResult.coupon_code, plan.id).then(setCouponResult);
                  }
                }}
                className={`relative rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-2 border-crimson-700 shadow-xl scale-[1.02]'
                    : 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-crimson-700 px-4 py-1 text-[11px] font-extrabold text-white shadow-md uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold font-serif text-navy-950">{plan.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-crimson-700 bg-crimson-700 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-navy-950">
                        ₹{plan.price_inr}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / {plan.duration_days} days
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Use code BOR50 for 50% discount
                    </p>
                  </div>

                  {/* Feature Checkmarks */}
                  <div className="space-y-3 text-xs text-slate-700 mb-8">
                    <div className="flex items-center gap-2.5 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Unlimited in-app messaging with matches</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>View verified family phone & email</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>See who viewed your profile</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Priority placement in community searches</span>
                    </div>
                    {plan.duration_days >= 90 && (
                      <div className="flex items-center gap-2.5 font-medium text-crimson-900">
                        <Star className="w-4 h-4 text-crimson-700 fill-crimson-700 flex-shrink-0" />
                        <span>Featured profile badge & save 17%</span>
                      </div>
                    )}
                    {plan.duration_days >= 365 && (
                      <div className="flex items-center gap-2.5 font-medium text-navy-900">
                        <Zap className="w-4 h-4 text-navy-700 fill-navy-700 flex-shrink-0" />
                        <span>Dedicated community matchmaker assistance</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-crimson-700 text-white hover:bg-crimson-800 shadow-md'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Selected Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Checkout & Coupon Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xl font-bold font-serif text-navy-950">
              Apply Community Coupon & Complete Enrollment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              BorKonya provides verified members of the Sadgope, Gowala, and Goala communities with promotional coupons to encourage family connections.
            </p>

            {/* Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2 max-w-md pt-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-crimson-700 absolute left-3 top-3" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. BOR50)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:border-crimson-700 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isApplyingCoupon}
                className="px-5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isApplyingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Apply Code</span>
              </button>
            </form>

            {couponError && <p className="text-xs text-rose-600 font-medium">{couponError}</p>}
            {couponResult && couponResult.is_valid && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{couponResult.message}</span>
              </div>
            )}
          </div>

          {/* Right Column: Price Summary & Pay CTA */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider pb-2 border-b border-slate-200">
              <span>{selectedPlan.name}</span>
              <span>{selectedPlan.duration_days} Days</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Standard Membership Price</span>
                <span className="font-semibold text-navy-950">₹{basePrice.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Community Discount (BOR50)</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Platform Maintenance & Safety</span>
                <span className="font-semibold text-emerald-600">FREE</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-navy-950">Total Net Payable</span>
              <div className="text-right">
                <span className="text-2xl font-black text-crimson-700">₹{netPayable.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block font-normal">incl. all taxes</span>
              </div>
            </div>

            <button
              onClick={() => setCheckoutModalOpen(true)}
              className="w-full py-3.5 bg-crimson-700 hover:bg-crimson-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Proceed to Pay ₹{netPayable.toFixed(0)}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Secure Indian Payment Gateway (UPI / Cards / NetBanking)</span>
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="mt-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <h3 className="text-xl font-bold font-serif text-navy-950 text-center mb-8">
            Free Membership vs. BorKonya Premium
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-4">Platform Feature</th>
                  <th className="pb-4 text-center">Free Membership</th>
                  <th className="pb-4 text-center text-crimson-700 font-bold">Premium Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3.5 font-medium">Create Culturally Rich Profile with Horoscope</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Included</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Rule-Based Matchmaking Score & Search Filters</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Included</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Express Interest to Verified Candidates</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Up to 10/day</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">In-App Chat Messaging</td>
                  <td className="py-3.5 text-center text-slate-400">Mutual Acceptance Only</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Direct Instant Chat</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">View Verified Family Contact Numbers (Phone & Email)</td>
                  <td className="py-3.5 text-center text-slate-400">Locked / Masked</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Full Unmasked Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">See Who Visited Your Profile</td>
                  <td className="py-3.5 text-center text-slate-400">Visitor Count Only</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">✓ Full Visitor Profiles</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modern Payment Gateway Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between border-b border-navy-900">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-crimson-400" />
                <span className="font-bold text-sm">BorKonya Secure Payment Gateway</span>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-navy-950">{selectedPlan.name}</h4>
                  <p className="text-xs text-slate-500">{selectedPlan.duration_days} Days Access</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-crimson-700">₹{netPayable.toFixed(2)}</span>
                  {discount > 0 && (
                    <span className="text-[10px] text-emerald-600 block font-semibold">
                      Saved ₹{discount.toFixed(0)} with BOR50
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-crimson-700 bg-crimson-50 text-crimson-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-crimson-700" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-navy-700 bg-navy-50 text-navy-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-navy-700" />
                    <span>Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NETBANKING')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'NETBANKING'
                        ? 'border-navy-700 bg-navy-50 text-navy-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Lock className="w-5 h-5 text-navy-700" />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Method Specific Fields */}
              {paymentMethod === 'UPI' && (
                <div className="space-y-2 p-3 bg-navy-50/70 rounded-xl border border-navy-200 text-xs text-navy-950">
                  <label className="font-semibold block">Enter Virtual Payment Address (VPA / UPI ID):</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi / phonepe / paytm"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-navy-300 text-xs font-mono"
                  />
                  <p className="text-[10px] text-navy-700">
                    Supports Google Pay, PhonePe, Paytm, BHIM, Cred, and Indian bank UPI apps.
                  </p>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <input
                    type="text"
                    defaultValue="•••• •••• •••• 4242"
                    disabled
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue="12/28"
                      disabled
                      className="w-1/2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                    />
                    <input
                      type="text"
                      defaultValue="•••"
                      disabled
                      className="w-1/2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">All Indian RuPay, Visa & Mastercard cards accepted.</span>
                </div>
              )}

              {paymentMethod === 'NETBANKING' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <select className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold">
                    <option>State Bank of India (SBI)</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Punjab National Bank</option>
                  </select>
                </div>
              )}

              {/* Pay Button */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="w-full py-3.5 bg-crimson-700 hover:bg-crimson-800 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming with Bank Gateway...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Pay ₹{netPayable.toFixed(2)} & Activate Instantly</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  );
};
