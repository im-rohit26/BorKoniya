import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, Phone, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import logoImg from '../assets/logo.jpeg';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      setErrorMessage('Please enter your mobile number or email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(phoneOrEmail.trim(), password);
      // Seamless SPA navigation without unnecessary full page reloads
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(
        err.message || 'Invalid mobile number/email or password. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => navigate('/register')}
      />

      <LanguageSelectorModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />

      {forgotModalOpen && (
        <ForgotPasswordModal
          isOpen={forgotModalOpen}
          onClose={() => setForgotModalOpen(false)}
          initialPhoneOrEmail={phoneOrEmail}
        />
      )}

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="rounded-3xl bg-white p-8 sm:p-10 shadow-xl border border-slate-200 transition-all">
            {/* Header Brand & Title */}
            <div className="text-center space-y-2 mb-8">
              <Link to="/" className="inline-block hover:opacity-95 transition-opacity mb-2">
                <img
                  src={logoImg}
                  alt="BorKoniya"
                  className="mx-auto h-12 sm:h-14 w-auto object-contain"
                />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-serif tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Log in to connect with eligible matches from the Sadgope, Gowala & Goala communities.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 rounded-2xl bg-rose-50 p-4 border border-rose-200 flex items-start space-x-3 text-xs font-medium text-rose-800 animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Phone Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mobile Number or Email
                </label>
                <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-crimson-700 focus-within:ring-1 focus-within:ring-crimson-700 transition-all shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    disabled={isLoading}
                    placeholder="e.g. 9876543210 or email@domain.com"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-xs font-bold text-crimson-700 hover:text-crimson-800 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-crimson-700 focus-within:ring-1 focus-within:ring-crimson-700 transition-all shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Demo Credentials Tip */}
              <div className="rounded-xl bg-navy-50/70 p-2.5 border border-navy-200/80 text-[11px] text-navy-950 flex items-center justify-between">
                <span>Demo: <span className="font-semibold">9876543210</span> / <span className="font-semibold">borkonya123</span></span>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneOrEmail('9876543210');
                    setPassword('borkonya123');
                  }}
                  className="font-bold text-crimson-700 hover:underline"
                >
                  Auto-fill
                </button>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center space-x-2 rounded-2xl bg-crimson-700 hover:bg-crimson-800 py-3.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Logging in...' : 'Login to Account'}</span>
                {!isLoading && <ArrowRight className="h-4 w-4 text-white" />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">New to BorKonya?</span>
              </div>
            </div>

            {/* Register CTA */}
            <Link
              to="/register"
              className="w-full flex items-center justify-center space-x-2 rounded-2xl border-2 border-slate-200 hover:border-navy-900 bg-white py-3 text-xs font-bold text-slate-800 hover:text-navy-950 hover:bg-navy-50/30 transition-all"
            >
              <Sparkles className="h-4 w-4 text-crimson-700" />
              <span>Create Free Matrimonial Profile</span>
            </Link>

            {/* Privacy note */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>100% Verified Community Profiles • Safe & Secure</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
