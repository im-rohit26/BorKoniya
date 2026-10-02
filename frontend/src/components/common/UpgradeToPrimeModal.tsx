import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  X,
  ArrowRight,
} from 'lucide-react';

interface UpgradeToPrimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const UpgradeToPrimeModal: React.FC<UpgradeToPrimeModalProps> = ({
  isOpen,
  onClose,
  featureName = 'Premium Profile Information',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-crimson-100 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white rounded-full hover:bg-black/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Navy & Crimson gradient */}
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-crimson-900 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Crown className="w-8 h-8 text-crimson-300 fill-crimson-300/30" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-crimson-100 mb-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-crimson-300" />
            <span>Prime Member Feature</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
            Upgrade to BorKonya Prime
          </h2>
          <p className="text-xs text-slate-200 mt-1 max-w-xs mx-auto">
            {featureName} is locked for non-Prime accounts. Upgrade your membership to unlock full access.
          </p>
        </div>

        {/* Benefits list */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 bg-crimson-50/50 rounded-2xl border border-crimson-100">
              <div className="p-2 bg-crimson-100 rounded-xl text-crimson-800 flex-shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-navy-900">Direct Family Contact Numbers</p>
                <p className="text-slate-600">Reveal verified phone numbers for direct parental discussions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-crimson-50/50 rounded-2xl border border-crimson-100">
              <div className="p-2 bg-crimson-100 rounded-xl text-crimson-800 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-navy-900">Verified Email & Address Details</p>
                <p className="text-slate-600">Access verified contact emails and family native location details.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-crimson-50/50 rounded-2xl border border-crimson-100">
              <div className="p-2 bg-crimson-100 rounded-xl text-crimson-800 flex-shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-navy-900">Instant In-App Family Messaging</p>
                <p className="text-slate-600">Initiate direct conversation with compatible prospective matches.</p>
              </div>
            </div>
          </div>

          {/* Pricing Highlight */}
          <div className="p-3.5 bg-navy-50 rounded-2xl border border-navy-200 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-slate-500 line-through">₹200/month</span>
              <span className="text-base font-extrabold text-navy-900">₹100 / month</span>
              <span className="px-2 py-0.5 rounded-full bg-crimson-700 text-[10px] font-bold text-white">
                50% OFF
              </span>
            </div>
            <p className="text-[11px] text-navy-800 mt-0.5">
              Apply community coupon code <span className="font-mono font-bold text-crimson-700">BOR50</span> at checkout
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-crimson-700 hover:bg-crimson-800 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <span>Buy Prime / Upgrade Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
