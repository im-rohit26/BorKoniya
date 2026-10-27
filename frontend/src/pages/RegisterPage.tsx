import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Smartphone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { sendOtp, verifyOtp } from '../lib/authApi';
import { masterDataApi } from '../lib/masterDataApi';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import { AuthErrorModal } from '../components/common/AuthErrorModal';
import logoImg from '../assets/logo.jpeg';

interface OtpInputRowProps {
  value: string[];
  onChange: (digits: string[]) => void;
  idPrefix: string;
  disabled?: boolean;
}

const OtpInputRow: React.FC<OtpInputRowProps> = ({
  value,
  onChange,
  idPrefix,
  disabled = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...value];

      if (newOtp[idx]) {
        // Current input has a digit -> delete it and keep focus
        newOtp[idx] = '';
        onChange(newOtp);
      } else if (idx > 0) {
        // Current input is already empty -> delete previous digit and move focus to previous input
        newOtp[idx - 1] = '';
        onChange(newOtp);
        inputRefs.current[idx - 1]?.focus();
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const newOtp = [...value];
      newOtp[idx] = '';
      onChange(newOtp);
      return;
    }

    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
      return;
    }
  };

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '');

    if (!cleanDigits) {
      const newOtp = [...value];
      newOtp[idx] = '';
      onChange(newOtp);
      return;
    }

    // Multiple digits entered (e.g. mobile auto-fill or inline paste)
    if (cleanDigits.length > 1) {
      const newOtp = [...value];
      let lastIndex = idx;
      for (let i = 0; i < cleanDigits.length && idx + i < 6; i++) {
        newOtp[idx + i] = cleanDigits[i];
        lastIndex = idx + i;
      }
      onChange(newOtp);
      const nextFocus = Math.min(lastIndex + 1, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Single digit entered
    const digit = cleanDigits.slice(-1);
    const newOtp = [...value];
    newOtp[idx] = digit;
    onChange(newOtp);

    // Auto-advance to next input
    if (idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    const cleanDigits = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!cleanDigits) return;

    const newOtp = [...value];
    const startIdx = cleanDigits.length === 6 ? 0 : idx;
    for (let i = 0; i < cleanDigits.length && startIdx + i < 6; i++) {
      newOtp[startIdx + i] = cleanDigits[i];
    }
    onChange(newOtp);

    const focusTarget = Math.min(startIdx + cleanDigits.length, 5);
    inputRefs.current[focusTarget]?.focus();
  };

  return (
    <div className="flex justify-between items-center gap-1.5 sm:gap-2.5 max-w-sm sm:max-w-md py-1">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          id={`${idPrefix}-${idx}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          value={digit}
          disabled={disabled}
          onFocus={(e) => e.target.select()}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onChange={(e) => handleChange(idx, e)}
          onPaste={(e) => handlePaste(idx, e)}
          className={`h-12 w-10 sm:h-13 sm:w-12 max-w-[48px] flex-1 rounded-xl border text-center text-lg sm:text-xl font-bold transition-all shadow-xs focus:outline-none ${
            digit
              ? 'border-blue-500 bg-blue-50/20 text-navy-950 ring-1 ring-blue-200'
              : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
        />
      ))}
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Steps: 1: 'who_for', 2: 'basic_details', 3: 'otp_verification', 4: 'success'
  const [step, setStep] = useState<'who_for' | 'basic_details' | 'otp_verification' | 'success'>('who_for');

  const [profileFor, setProfileFor] = useState('MYSELF');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'FEMALE',
    dob: '1998-05-15',
    community: 'Sadgope',
    subCommunity: 'Kulin Sadgope',
    nativePlace: 'Bardhaman',
    currentState: 'West Bengal',
    currentCity: 'Kolkata',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Separate Phone and Email OTP states
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Separate countdown timers for Resend OTP (Mockup shows 00:30)
  const [phoneTimer, setPhoneTimer] = useState(30);
  const [emailTimer, setEmailTimer] = useState(30);
  const [isResendingPhone, setIsResendingPhone] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [profileForOptions, setProfileForOptions] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    masterDataApi.getProfileForOptions().then((res) => {
      setProfileForOptions(res);
      if (res.length > 0) setProfileFor(res[0].value);
    }).catch(() => {});
    masterDataApi.getCommunities().then(setCommunities).catch(() => {});
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'otp_verification') return;
    const interval = setInterval(() => {
      setPhoneTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setEmailTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorModal(true);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectWhoFor = (val: string) => {
    setProfileFor(val);
    if (val === 'SON' || val === 'BROTHER') {
      setFormData((prev) => ({ ...prev, gender: 'MALE' }));
    } else if (val === 'DAUGHTER' || val === 'SISTER') {
      setFormData((prev) => ({ ...prev, gender: 'FEMALE' }));
    }
    setStep('basic_details');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowErrorModal(false);

    // Frontend validations
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      triggerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      triggerError('A valid email address is required for account verification.');
      return;
    }
    if (formData.password.length < 8) {
      triggerError('Password must contain at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      triggerError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send OTP to mobile and email
      await Promise.all([
        sendOtp({ phoneNumber: cleanPhone }),
        sendOtp({ email: cleanEmail }),
      ]);
      setPhoneTimer(30);
      setEmailTimer(30);
      setPhoneOtp(['', '', '', '', '', '']);
      setEmailOtp(['', '', '', '', '', '']);
      setPhoneVerified(false);
      setEmailVerified(false);
      setStep('otp_verification');
    } catch (err: any) {
      triggerError(err.message || 'Failed to send verification OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (phoneTimer > 0 || isResendingPhone || isSubmitting) return;
    setIsResendingPhone(true);
    try {
      await sendOtp({ phoneNumber: formData.phone.trim() });
      setPhoneTimer(30);
      setPhoneOtp(['', '', '', '', '', '']);
      setPhoneVerified(false);
    } catch (err: any) {
      triggerError(err.message || 'Failed to resend SMS code. Please try again.');
    } finally {
      setIsResendingPhone(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (emailTimer > 0 || isResendingEmail || isSubmitting) return;
    setIsResendingEmail(true);
    try {
      await sendOtp({ email: formData.email.trim() });
      setEmailTimer(30);
      setEmailOtp(['', '', '', '', '', '']);
      setEmailVerified(false);
    } catch (err: any) {
      triggerError(err.message || 'Failed to resend Email code. Please try again.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setShowErrorModal(false);

    const enteredPhoneOtp = phoneOtp.join('');
    const enteredEmailOtp = emailOtp.join('');

    if (enteredPhoneOtp.length !== 6) {
      triggerError('Please enter the full 6-digit Mobile OTP sent to your phone.');
      return;
    }

    if (enteredEmailOtp.length !== 6) {
      triggerError('Please enter the full 6-digit Email OTP sent to your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify Mobile OTP if not verified yet
      if (!phoneVerified) {
        try {
          await verifyOtp({ phoneNumber: formData.phone.trim() }, enteredPhoneOtp);
          setPhoneVerified(true);
        } catch (err: any) {
          throw new Error(err.message ? `Mobile OTP: ${err.message}` : 'Invalid or expired Mobile OTP code.');
        }
      }

      // 2. Verify Email OTP if not verified yet
      if (!emailVerified) {
        try {
          await verifyOtp({ email: formData.email.trim() }, enteredEmailOtp);
          setEmailVerified(true);
        } catch (err: any) {
          throw new Error(err.message ? `Email OTP: ${err.message}` : 'Invalid or expired Email OTP code.');
        }
      }

      // 3. Register user & establish authenticated session
      await register({
        profile_for: profileFor,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        gender: formData.gender,
        date_of_birth: formData.dob,
        phone_number: formData.phone.trim(),
        password: formData.password,
        community: formData.community,
        sub_community: formData.subCommunity,
        native_place: formData.nativePlace,
        current_state: formData.currentState,
        current_city: formData.currentCity,
        email: formData.email.trim(),
      });

      setStep('success');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      triggerError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => {}}
      />

      <LanguageSelectorModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />

      {showErrorModal && errorMessage && (
        <AuthErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          message={errorMessage}
          onPrimaryAction={() => {
            const lower = errorMessage.toLowerCase();
            if (lower.includes('already exists') || lower.includes('already registered') || lower.includes('log in')) {
              setShowErrorModal(false);
              navigate('/login');
            } else {
              setShowErrorModal(false);
            }
          }}
          primaryActionText={
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('already registered') ||
            errorMessage.toLowerCase().includes('log in')
              ? 'Go to Login'
              : 'Okay, Got It'
          }
          onSecondaryAction={
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('already registered') ||
            errorMessage.toLowerCase().includes('log in')
              ? () => setShowErrorModal(false)
              : undefined
          }
          secondaryActionText={
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('already registered') ||
            errorMessage.toLowerCase().includes('log in')
              ? 'Change Details'
              : undefined
          }
        />
      )}

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className={`w-full transition-all duration-300 ${step === 'otp_verification' ? 'max-w-xl' : 'max-w-lg'}`}>
          <div className="rounded-3xl bg-white p-5 sm:p-8 shadow-xl border border-slate-200">
            {/* Brand Logo Header */}
            <div className="text-center mb-6">
              <Link to="/" className="inline-block hover:opacity-95 transition-opacity">
                <img
                  src={logoImg}
                  alt="BorKoniya"
                  className="mx-auto h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Step Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span className={step === 'otp_verification' ? 'text-[#1e3a8a] font-bold' : ''}>
                  {step === 'who_for' && 'Step 1 of 3: Profile For'}
                  {step === 'basic_details' && 'Step 2 of 3: Details & Contact'}
                  {step === 'otp_verification' && 'STEP 3 OF 3: VERIFY CONTACT'}
                  {step === 'success' && 'Account Created!'}
                </span>
                <span className={step === 'otp_verification' ? 'text-[#1e3a8a] font-bold' : 'text-crimson-700 font-semibold'}>
                  {step === 'who_for' && '33%'}
                  {step === 'basic_details' && '66%'}
                  {step === 'otp_verification' && '100%'}
                  {step === 'success' && '100%'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    step === 'otp_verification' ? 'bg-[#1d4ed8]' : 'bg-gradient-to-r from-crimson-600 to-navy-900'
                  }`}
                  style={{
                    width:
                      step === 'who_for'
                        ? '33%'
                        : step === 'basic_details'
                        ? '66%'
                        : '100%',
                  }}
                />
              </div>
            </div>

            {/* Step 1: Who are you creating this profile for? */}
            {step === 'who_for' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-crimson-50 text-crimson-700 border border-crimson-200 shadow-xs">
                    <Users className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy-950 font-serif">
                    Who are you creating this profile for?
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    BorKonya supports personal, parental and family-assisted matrimonial matchmaking.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {profileForOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectWhoFor(opt.value)}
                      className={`flex items-center justify-between min-h-[48px] p-4 rounded-2xl border text-xs sm:text-sm font-semibold transition-all ${
                        profileFor === opt.value
                          ? 'border-crimson-700 bg-crimson-50 text-crimson-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white active:bg-slate-100'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <ArrowRight className="h-4 w-4 text-crimson-700 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-crimson-700 hover:underline">
                    Log in here
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Basic & Contact Details */}
            {step === 'basic_details' && (
              <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in">
                <div className="text-center mb-2">
                  <h2 className="text-lg sm:text-xl font-bold text-navy-950 font-serif">
                    Basic & Contact Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your contact information is strictly protected and never displayed publicly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Subham"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pal"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="FEMALE">Female (Bride)</option>
                      <option value="MALE">Male (Groom)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Community *</label>
                    <select
                      value={formData.community}
                      onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="">{communities.length > 0 ? 'Select Community' : 'Loading...'}</option>
                      {communities.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Native Place</label>
                    <input
                      type="text"
                      placeholder="e.g. Bardhaman, Medinipur"
                      value={formData.nativePlace}
                      onChange={(e) => setFormData({ ...formData, nativePlace: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (For OTP) *</label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={formData.phone}
                        onKeyDown={(e) => {
                          if (
                            ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) ||
                            e.ctrlKey ||
                            e.metaKey
                          ) {
                            return;
                          }
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: digitsOnly });
                        }}
                        className="w-full min-h-[44px] rounded-r-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (For Verification) *</label>
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 chars) *</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('who_for')}
                    className="w-1/3 min-h-[44px] rounded-xl border border-slate-200 py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 min-h-[44px] flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-crimson-800 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Sending Code...' : 'Send Verification OTP'}</span>
                    <ArrowRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: OTP Verification - Reference Design */}
            {step === 'otp_verification' && (
              <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 animate-in fade-in">
                {/* Title and Subtitle */}
                <div className="text-center mb-5">
                  <h2 className="text-2xl sm:text-[26px] font-bold text-navy-950 font-serif tracking-tight">
                    Verify Your Contact Details
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Enter the codes sent to your phone and email to secure your account.
                  </p>
                </div>

                {/* Section 1: Mobile Number Verification Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 flex-shrink-0 border border-blue-100">
                      <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-navy-950 leading-tight">
                        Mobile Number Verification
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                        +91 {formData.phone}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    We sent a 6-digit code to your mobile number.
                  </p>

                  <OtpInputRow
                    value={phoneOtp}
                    onChange={(val) => {
                      setPhoneOtp(val);
                      setPhoneVerified(false);
                    }}
                    idPrefix="phone-otp"
                    disabled={isSubmitting}
                  />

                  <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-3 font-medium">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    {phoneTimer > 0 ? (
                      <span>Resend SMS in {formatTimer(phoneTimer)}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendPhoneOtp}
                        disabled={isResendingPhone || isSubmitting}
                        className="hover:underline font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                      >
                        {isResendingPhone ? 'Sending SMS...' : 'Resend SMS'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 2: Email Verification Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 flex-shrink-0 border border-blue-100">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-navy-950 leading-tight">
                        Email Verification
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5 truncate">
                        {formData.email}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    We sent a 6-digit code to your email address.
                  </p>

                  <OtpInputRow
                    value={emailOtp}
                    onChange={(val) => {
                      setEmailOtp(val);
                      setEmailVerified(false);
                    }}
                    idPrefix="email-otp"
                    disabled={isSubmitting}
                  />

                  <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-3 font-medium">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    {emailTimer > 0 ? (
                      <span>Resend email in {formatTimer(emailTimer)}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendEmailOtp}
                        disabled={isResendingEmail || isSubmitting}
                        className="hover:underline font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                      >
                        {isResendingEmail ? 'Sending email...' : 'Resend email'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Privacy Guarantee Note */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span>Your contact details stay private and secure.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('basic_details')}
                    disabled={isSubmitting}
                    className="w-1/3 min-h-[46px] rounded-xl border border-slate-300 bg-white py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 min-h-[46px] flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-crimson-800 active:bg-crimson-900 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Verifying & Creating...' : 'Verify & Create Account'}</span>
                    <ArrowRight className="h-4 w-4 text-white flex-shrink-0" />
                  </button>
                </div>

                {/* Footer Sub-Note */}
                <p className="text-center text-[11px] text-slate-400 pt-1">
                  Didn't receive a code? Check spam or resend when available.
                </p>
              </form>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shadow-md">
                  <CheckCircle className="h-9 w-9" />
                </div>
                <h2 className="text-2xl font-bold text-navy-950 font-serif">
                  Welcome to BorKonya!
                </h2>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  Your account has been created and verified. Redirecting to your matrimonial dashboard...
                </p>
                <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Mobile & Email Verified Badges Assigned</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
