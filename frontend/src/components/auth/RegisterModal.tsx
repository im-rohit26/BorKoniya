import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Users,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react'
import { sendOtp, verifyOtp } from '../../lib/authApi'
import { useAuth } from '../../context/AuthContext'
import logoImg from '../../assets/logo.jpeg'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (userProfile: any) => void
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation()

  // Steps: 1: 'who_for', 2: 'basic_details', 3: 'otp_verification', 4: 'success'
  const [step, setStep] = useState<'who_for' | 'basic_details' | 'otp_verification' | 'success'>(
    'who_for'
  )

  const [profileFor, setProfileFor] = useState('MYSELF')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'FEMALE',
    dob: '1998-05-15',
    heightCm: '165',
    maritalStatus: 'NEVER_MARRIED',
    state: 'West Bengal',
    city: 'Kolkata',
    nativePlace: 'Bardhaman',
    community: 'Sadgope',
    phone: '',
    email: '',
    password: '',
  })

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (!isOpen) return null

  const profileForOptions = [
    { id: 'MYSELF', label: t('onboarding.myself', 'Myself') },
    { id: 'SON', label: t('onboarding.son', 'My Son') },
    { id: 'DAUGHTER', label: t('onboarding.daughter', 'My Daughter') },
    { id: 'BROTHER', label: t('onboarding.brother', 'My Brother') },
    { id: 'SISTER', label: t('onboarding.sister', 'My Sister') },
    { id: 'RELATIVE', label: t('onboarding.relative', 'Relative') },
    { id: 'OTHER', label: t('onboarding.other', 'Other') },
  ]

  const { register } = useAuth()

  const handleSelectWhoFor = (val: string) => {
    setProfileFor(val)
    if (val === 'SON' || val === 'BROTHER') {
      setFormData((prev) => ({ ...prev, gender: 'MALE' }))
    } else if (val === 'DAUGHTER' || val === 'SISTER') {
      setFormData((prev) => ({ ...prev, gender: 'FEMALE' }))
    }
    setStep('basic_details')
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = formData.phone.trim()
    const cleanEmail = formData.email.trim()
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number')
      return
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('A valid email address is required for account verification')
      return
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters')
      return
    }
    setErrorMessage('')
    setResendSuccess(null)
    setIsSubmitting(true)

    try {
      const res = await sendOtp({ phoneNumber: cleanPhone, email: cleanEmail })
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp)
      } else {
        setDemoOtp(null)
      }
      setResendCooldown(60)
      setStep('otp_verification')
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return
    const cleanPhone = formData.phone.trim()
    const cleanEmail = formData.email.trim()
    setErrorMessage('')
    setResendSuccess(null)
    setIsSubmitting(true)

    try {
      const res = await sendOtp({ phoneNumber: cleanPhone, email: cleanEmail })
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp)
      } else {
        setDemoOtp(null)
      }
      setResendCooldown(60)
      setResendSuccess('New verification code sent successfully to your email.')
      setOtp(['', '', '', '', '', ''])
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resend OTP. Please wait a moment and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0]
    const updated = [...otp]
    updated[index] = val
    setOtp(updated)

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const entered = otp.join('')
    if (entered.length < 4) {
      setErrorMessage('Please enter the OTP verification code')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await verifyOtp({ phoneNumber: formData.phone.trim(), email: formData.email.trim() }, entered)
      await register({
        profile_for: profileFor,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        gender: formData.gender,
        date_of_birth: formData.dob,
        phone_number: formData.phone.trim(),
        password: formData.password,
        community: formData.community,
        sub_community: formData.nativePlace,
        native_place: formData.nativePlace,
        current_state: formData.state,
        current_city: formData.city,
        email: formData.email.trim(),
      })

      setStep('success')
      setTimeout(() => {
        onSuccess({
          name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
          community: formData.community,
        })
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-5 pr-8">
          <img
            src={logoImg}
            alt="BorKoniya"
            className="h-10 w-auto object-contain mx-auto"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>
              {step === 'who_for' && 'Step 1 of 3: Profile For'}
              {step === 'basic_details' && 'Step 2 of 3: Basic & Contact Details'}
              {step === 'otp_verification' && 'Step 3 of 3: Mobile OTP Verification'}
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

        {step === 'who_for' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-crimson-50 text-crimson-700 border border-crimson-200">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-navy-950 font-serif">
                {t('onboarding.whoForTitle', 'Who are you creating this profile for?')}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                BorKonya supports personal, parental and family-assisted matrimonial matchmaking.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {profileForOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectWhoFor(opt.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                    profileFor === opt.id
                      ? 'border-crimson-700 bg-crimson-50 text-crimson-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  <ArrowRight className="h-4 w-4 text-crimson-700" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'basic_details' && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-navy-950 font-serif">
                Basic & Contact Information
              </h2>
              <p className="text-xs text-slate-500">
                Your phone number is strictly private and never shown publicly.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ghosh"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender *</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth *</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Community *</label>
                <select
                  value={formData.community}
                  onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                >
                  <option value="Sadgope">Sadgope</option>
                  <option value="Gowala / Goala">Gowala / Goala</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Native Place</label>
                <input
                  type="text"
                  placeholder="e.g. Bardhaman / Medinipur"
                  value={formData.nativePlace}
                  onChange={(e) => setFormData({ ...formData, nativePlace: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number (For OTP) *
                </label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address (For Verification) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-crimson-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Create Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                className="w-2/3 flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 py-3 text-xs font-bold text-white shadow-md transition-all"
              >
                <span>{isSubmitting ? 'Sending Verification Code...' : 'Send Verification OTP'}</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </form>
        )}

        {step === 'otp_verification' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-navy-950 font-serif">
                Account Verification
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Enter the 6-digit OTP sent to{' '}
                <span className="font-semibold text-navy-900">{formData.email}</span>
                {formData.phone ? ` and +91 ${formData.phone}` : ''}
              </p>

              {demoOtp && (
                <div className="mt-3 inline-block rounded-lg bg-crimson-50 px-3 py-1.5 text-xs text-crimson-900 border border-crimson-200">
                  Demo Verification Code: <span className="font-mono font-bold text-crimson-700">{demoOtp}</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-center space-x-2.5 py-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="h-12 w-11 rounded-xl border border-slate-300 text-center text-lg font-bold text-slate-900 focus:border-crimson-700 focus:ring-2 focus:ring-crimson-200 focus:outline-none shadow-xs"
                />
              ))}
            </div>

            {resendSuccess && (
              <div className="rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700 border border-emerald-200 text-center">
                {resendSuccess}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Didn't receive the email OTP?</span>
              {resendCooldown > 0 ? (
                <span className="font-semibold text-slate-400">
                  Resend in <span className="font-mono text-crimson-700">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="font-bold text-crimson-700 hover:text-crimson-800 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
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
                className="w-2/3 flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 py-3 text-xs font-bold text-white shadow-md transition-all"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isSubmitting ? 'Verifying...' : 'Verify & Complete Profile'}</span>
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shadow-md">
              <CheckCircle className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold text-navy-950 font-serif">
              Welcome to BorKonya!
            </h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Your mobile number has been verified. Initial profile for{' '}
              <span className="font-semibold text-navy-950">{formData.firstName}</span> has been created.
            </p>
            <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              <span>Mobile Verified Badge Assigned</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
