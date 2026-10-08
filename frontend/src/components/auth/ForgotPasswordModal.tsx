import React, { useState, useEffect } from 'react';
import { X, KeyRound, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPassword, resetPassword } from '../../lib/authApi';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhoneOrEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialPhoneOrEmail = '',
}) => {
  const [step, setStep] = useState<'request_otp' | 'verify_and_reset' | 'success'>('request_otp');
  const [phoneOrEmail, setPhoneOrEmail] = useState(initialPhoneOrEmail);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      setErrorMessage('Please enter your mobile number or email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResendSuccess(null);

    try {
      const res = await forgotPassword(phoneOrEmail.trim());
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
      }
      setResendCooldown(60);
      setStep('verify_and_reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResendSuccess(null);
    try {
      const res = await forgotPassword(phoneOrEmail.trim());
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
      }
      setResendCooldown(60);
      setResendSuccess('New verification code sent successfully.');
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resend OTP. Please wait a moment and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setErrorMessage('Please enter the OTP verification code');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must contain at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword(phoneOrEmail.trim(), otpCode.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please check OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 pt-2 overflow-y-auto flex-1 space-y-4">
          {step === 'request_otp' && (
            <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-crimson-50 text-crimson-700 border border-crimson-200">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-navy-950 font-serif">Reset Password</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your registered mobile number or email. We will send you a verification code.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Mobile Number or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210 or your.email@example.com"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-crimson-700 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-crimson-800 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Sending verification code...' : 'Send Verification OTP'}</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </button>
            </form>
          )}

        {step === 'verify_and_reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-crimson-50 text-crimson-700 border border-crimson-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-navy-950 font-serif">Enter Code & New Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Verification code sent for <span className="font-semibold text-slate-800 break-all">{phoneOrEmail}</span>
              </p>

              {demoOtp && (
                <div className="mt-2 inline-block rounded-lg bg-crimson-50 px-3 py-1 text-xs text-crimson-900 border border-crimson-200">
                  Demo Code: <span className="font-mono font-bold text-crimson-700">{demoOtp}</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="749201"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold tracking-widest text-center focus:border-crimson-700 focus:outline-none"
              />
            </div>

            {resendSuccess && (
              <div className="rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700 border border-emerald-200 text-center">
                {resendSuccess}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Didn't receive code?</span>
              {resendCooldown > 0 ? (
                <span className="font-semibold text-slate-400">
                  Resend in <span className="font-mono text-crimson-700">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="min-h-[44px] flex items-center font-bold text-crimson-700 hover:text-crimson-800 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-crimson-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-crimson-700 focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('request_otp')}
                className="w-1/3 min-h-[44px] rounded-xl border border-slate-200 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 min-h-[44px] rounded-xl bg-crimson-700 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-crimson-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shadow-md">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-bold text-navy-950 font-serif">Password Reset Successful</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
              Your password has been securely updated. You can now log in with your new password.
            </p>
            <button
              onClick={onClose}
              className="w-full min-h-[44px] rounded-xl bg-crimson-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-crimson-800 transition-colors"
            >
              Continue to Login
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
