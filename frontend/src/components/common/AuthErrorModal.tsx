import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  X,
  ArrowRight,
  LogIn,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export interface AuthErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  onPrimaryAction?: () => void;
  primaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onPrimaryAction,
  primaryActionText,
  onSecondaryAction,
  secondaryActionText,
}) => {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const lowerMsg = message.toLowerCase();
  const isAccountExists =
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('already registered') ||
    lowerMsg.includes('please log in') ||
    lowerMsg.includes('please login');

  const isCredentialsError =
    lowerMsg.includes('incorrect') ||
    lowerMsg.includes('invalid') ||
    lowerMsg.includes('credential') ||
    lowerMsg.includes('password');

  // Compute smart title and action texts if not provided explicitly
  const resolvedTitle =
    title ||
    (isAccountExists
      ? 'Account Already Exists'
      : isCredentialsError
      ? 'Unable to Sign In'
      : 'Action Required');

  const defaultPrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else if (isAccountExists) {
      onClose();
      navigate('/login');
    } else {
      onClose();
    }
  };

  const defaultPrimaryText =
    primaryActionText ||
    (isAccountExists
      ? 'Go to Login'
      : isCredentialsError
      ? 'Try Again'
      : 'Okay, Got It');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-error-title"
      >
        {/* Subtle decorative top colored bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-crimson-600 to-rose-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 text-center">
          {/* Visual Icon Badge */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200/80 shadow-xs text-rose-600">
            <AlertCircle className="h-8 w-8 text-rose-600 stroke-[2.2]" />
          </div>

          {/* Modal Title */}
          <h3
            id="auth-error-title"
            className="text-xl font-bold font-serif text-slate-900 tracking-tight mb-2"
          >
            {resolvedTitle}
          </h3>

          {/* Error Message Box */}
          <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-3.5 sm:p-4 mb-6 text-left">
            <p className="text-xs sm:text-sm font-medium text-rose-900 leading-relaxed text-center sm:text-left">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={defaultPrimaryAction}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-white font-bold text-xs sm:text-sm px-5 py-3 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
            >
              {isAccountExists ? (
                <LogIn className="w-4 h-4" />
              ) : isCredentialsError ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{defaultPrimaryText}</span>
              {isAccountExists && <ArrowRight className="w-4 h-4" />}
            </button>

            {onSecondaryAction && secondaryActionText ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm px-4 py-2.5 transition-colors cursor-pointer"
              >
                <span>{secondaryActionText}</span>
              </button>
            ) : isCredentialsError && !isAccountExists ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center space-x-1.5 text-slate-500 hover:text-slate-800 font-semibold text-xs py-2 transition-colors cursor-pointer"
              >
                <span>Dismiss</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
