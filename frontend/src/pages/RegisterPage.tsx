import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { sendOtp, verifyOtp } from '../lib/authApi';
import { masterDataApi } from '../lib/masterDataApi';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import logoImg from '../assets/logo.jpeg';

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

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profileForOptions, setProfileForOptions] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    masterDataApi.getProfileForOptions().then(res => {
      setProfileForOptions(res);
      if (res.length > 0) setProfileFor(res[0].value);
    }).catch(() => {});
    masterDataApi.getCommunities().then(setCommunities).catch(() => {});
  }, []);

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

    // Frontend validations
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }
    if (formData.email && !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(cleanPhone);
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
      }
      setStep('otp_verification');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0];
    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);

    if (val && index < 5) {
      const nextInput = document.getElementById(`reg-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 4) {
      setErrorMessage('Please enter the full verification OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify OTP with backend
      await verifyOtp(formData.phone.trim(), enteredOtp);

      // 2. Register user & establish authenticated session
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
        email: formData.email.trim() || undefined,
      });

      setStep('success');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
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

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-xl border border-slate-200">
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
                <span>
                  {step === 'who_for' && 'Step 1 of 3: Profile For'}
                  {step === 'basic_details' && 'Step 2 of 3: Details & Contact'}
                  {step === 'otp_verification' && 'Step 3 of 3: Phone Verification'}
                  {step === 'success' && 'Account Created!'}
                </span>
                <span className="text-crimson-700 font-semibold">
                  {step === 'who_for' && '33%'}
                  {step === 'basic_details' && '66%'}
                  {step === 'otp_verification' && '90%'}
                  {step === 'success' && '100%'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-crimson-600 to-navy-900 transition-all duration-300"
                  style={{
                    width:
                      step === 'who_for'
                        ? '33%'
                        : step === 'basic_details'
                        ? '66%'
                        : step === 'otp_verification'
                        ? '90%'
                        : '100%',
                  }}
                />
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 rounded-2xl bg-rose-50 p-4 border border-rose-200 flex items-start space-x-3 text-xs font-semibold text-rose-800 animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

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

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {profileForOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelectWhoFor(opt.value)}
                      className={`flex items-center justify-between p-4 rounded-2xl border text-sm font-semibold transition-all ${
                        profileFor === opt.value
                          ? 'border-crimson-700 bg-crimson-50 text-crimson-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <ArrowRight className="h-4 w-4 text-crimson-700" />
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
                  <h2 className="text-xl font-bold text-navy-950 font-serif">
                    Basic & Contact Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your contact information is strictly protected and never displayed publicly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Subham"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Community *</label>
                    <select
                      value={formData.community}
                      onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (For OTP) *</label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600">
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
                        className="w-full rounded-r-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 chars) *</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('who_for')}
                    className="w-1/3 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 py-3 text-xs font-bold text-white shadow-md hover:bg-crimson-800 transition-all disabled:opacity-60"
                  >
                    <span>{isSubmitting ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                    <ArrowRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: OTP Verification */}
            {step === 'otp_verification' && (
              <form onSubmit={handleVerifyOtpAndRegister} className="space-y-5 animate-in fade-in">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Smartphone className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold text-navy-950 font-serif">
                    Verify Mobile Number
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the 6-digit OTP sent to{' '}
                    <span className="font-semibold text-slate-800">+91 {formData.phone}</span>
                  </p>

                  {demoOtp && (
                    <div className="mt-3 inline-block rounded-lg bg-crimson-50 px-3 py-1.5 text-xs text-crimson-900 border border-crimson-200">
                      Demo Verification Code:{' '}
                      <span className="font-mono font-bold text-crimson-700">{demoOtp}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center space-x-2.5 py-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`reg-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="h-12 w-11 rounded-xl border border-slate-300 text-center text-lg font-bold text-slate-900 focus:border-crimson-700 focus:ring-2 focus:ring-crimson-200 focus:outline-none shadow-xs"
                    />
                  ))}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('basic_details')}
                    className="w-1/3 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 py-3 text-xs font-bold text-white shadow-md hover:bg-crimson-800 transition-all disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{isSubmitting ? 'Verifying & Registering...' : 'Verify & Create Account'}</span>
                  </button>
                </div>
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
                  <span>Mobile Verified Badge Assigned</span>
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
