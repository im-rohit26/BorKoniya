import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  HeartHandshake,
  LayoutDashboard,
  UserCheck,
  ArrowRight,
  Pencil,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProfileResponse } from '../../lib/profileApi'
import { uploadProfilePhoto } from '../../lib/profileApi'
import type { UserMe } from '../../lib/authApi'
import { getDefaultAvatar } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

interface HeroProps {
  onStartRegistration: () => void
  onStartSearch: () => void
  user?: UserMe | null
  myProfile?: ProfileResponse | null
  isAuthenticated?: boolean
  onNavigateDashboard?: () => void
  onNavigateProfileWizard?: () => void
}

export const Hero: React.FC<HeroProps> = ({
  onStartRegistration,
  onStartSearch,
  user,
  myProfile,
  isAuthenticated,
  onNavigateDashboard,
  onNavigateProfileWizard,
}) => {
  const { t } = useTranslation()
  const { refreshUser } = useAuth()
  const [isUploadingHomePhoto, setIsUploadingHomePhoto] = useState(false)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)
  const homeFileInputRef = useRef<HTMLInputElement | null>(null)

  const handleHomePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB.')
      return
    }
    setIsUploadingHomePhoto(true)
    try {
      const uploaded = await uploadProfilePhoto(file, true, myProfile?.id || user?.profile_id || undefined)
      setCurrentPhotoUrl(uploaded.storage_path)
      await refreshUser()
    } catch (err: any) {
      console.error('Home DP upload failed:', err)
      alert(err.message || 'Failed to update photo. Please try again.')
    } finally {
      setIsUploadingHomePhoto(false)
      if (homeFileInputRef.current) homeFileInputRef.current.value = ''
    }
  }

  const hasProfile = !!myProfile || !!user?.profile_id

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-crimson-50/30 via-white to-slate-50/60 pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Subtle decorative background glows in theme colors */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-crimson-100/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -z-10 h-80 w-80 rounded-full bg-navy-100/30 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 rounded-full bg-crimson-50 px-4 py-1.5 text-xs font-semibold text-crimson-900 border border-crimson-200/80 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-crimson-700" />
              <span>{t('hero.trustedBadge', 'Dedicated Sadgope & Gowala Matrimony')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy-950 font-serif leading-[1.15]">
              Find Your Life Partner Within Your{' '}
              <span className="relative whitespace-nowrap text-crimson-700">
                <span className="relative z-10">Community</span>
                <span className="absolute bottom-1.5 left-0 -z-10 h-2.5 w-full bg-crimson-100/80 rounded-xs" />
              </span>
            </h1>

            <p className="mx-auto lg:mx-0 max-w-2xl text-base sm:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed">
              {t(
                'hero.subtitle',
                'Meaningful connections for Sadgope, Gowala & Goala families. Preserving sacred values, honoring traditions, and embracing modern aspirations.'
              )}
            </p>

            {/* CTAs: Dynamic based on logged in status */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2 w-full">
              {isAuthenticated ? (
                hasProfile ? (
                  <>
                    <button
                      onClick={onNavigateDashboard}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-crimson-700 hover:bg-crimson-800 px-8 py-3.5 sm:py-4 text-base font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
                    >
                      <LayoutDashboard className="h-5 w-5 text-crimson-100" />
                      <span>Go to Dashboard</span>
                    </button>
                    <button
                      onClick={onStartSearch}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border-2 border-navy-800 bg-white px-7 py-3 sm:py-3.5 text-base font-semibold text-navy-900 hover:bg-navy-50 transition-all"
                    >
                      <Search className="h-5 w-5 text-crimson-700" />
                      <span>{t('hero.ctaSearch', 'Find Your Match')}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onNavigateProfileWizard}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-crimson-700 hover:bg-crimson-800 px-8 py-3.5 sm:py-4 text-base font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
                    >
                      <UserCheck className="h-5 w-5 text-crimson-100" />
                      <span>Complete Your Profile</span>
                    </button>
                    <button
                      onClick={onStartSearch}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border-2 border-navy-800 bg-white px-7 py-3 sm:py-3.5 text-base font-semibold text-navy-900 hover:bg-navy-50 transition-all"
                    >
                      <Search className="h-5 w-5 text-crimson-700" />
                      <span>{t('hero.ctaSearch', 'Find Your Match')}</span>
                    </button>
                  </>
                )
              ) : (
                <>
                  <button
                    onClick={onStartRegistration}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-crimson-700 hover:bg-crimson-800 px-8 py-3.5 sm:py-4 text-base font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
                  >
                    <HeartHandshake className="h-5 w-5 text-crimson-100" />
                    <span>{t('hero.ctaRegister', 'Create Your Profile')}</span>
                  </button>
                  <button
                    onClick={onStartSearch}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border-2 border-navy-800 bg-white px-7 py-3 sm:py-3.5 text-base font-semibold text-navy-900 hover:bg-navy-50 transition-all"
                  >
                    <Search className="h-5 w-5 text-crimson-700" />
                    <span>{t('hero.ctaSearch', 'Find Your Match')}</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust Badges - responsive grid from 1 col on small phones to 3 cols */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 border-t border-slate-200 text-left max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 justify-center sm:justify-start">
                <CheckCircle2 className="h-4 w-4 text-crimson-700 flex-shrink-0" />
                <span>100% Verified Profiles</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 justify-center sm:justify-start">
                <ShieldCheck className="h-4 w-4 text-crimson-700 flex-shrink-0" />
                <span>Contact Privacy Control</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 justify-center sm:justify-start">
                <Users className="h-4 w-4 text-crimson-700 flex-shrink-0" />
                <span>Family Centric Matchmaking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Matrimonial Card Presentation */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5">
              {isAuthenticated && (myProfile || user) ? (
                /* Authenticated Member's Own Profile Card */
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-crimson-50/60 via-white to-navy-50/50 p-6 text-center border border-slate-100">
                  <div className="relative mx-auto mb-4 h-24 w-24 sm:h-28 sm:w-28 group">
                    <div className="h-full w-full rounded-full border-2 border-crimson-700 p-1 shadow-xs overflow-hidden bg-white">
                      <img
                        src={currentPhotoUrl || myProfile?.photo_url || user?.photo_url || getDefaultAvatar(myProfile?.gender || user?.gender)}
                        alt={myProfile?.first_name || user?.first_name || 'Member'}
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget
                          const fallback = getDefaultAvatar(myProfile?.gender || user?.gender)
                          if (target.src !== fallback) target.src = fallback
                        }}
                      />
                    </div>

                    {/* Pencil Edit Icon to Change DP */}
                    <button
                      type="button"
                      onClick={() => homeFileInputRef.current?.click()}
                      disabled={isUploadingHomePhoto}
                      aria-label="Change Profile Photo"
                      title="Change Profile Photo"
                      className="absolute -bottom-1 -right-1 p-2 rounded-full bg-crimson-700 hover:bg-crimson-800 text-white shadow-md border-2 border-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer z-10"
                    >
                      {isUploadingHomePhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <input
                      ref={homeFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleHomePhotoUpload}
                    />
                  </div>

                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-crimson-50 px-3 py-1 text-xs font-semibold text-crimson-800 border border-crimson-200 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-crimson-700" />
                    <span>Your Active Profile</span>
                  </div>

                  <h3 className="text-xl font-bold text-navy-950 font-serif">
                    {myProfile
                      ? `${myProfile.first_name} ${myProfile.last_name || ''}${myProfile.age ? `, ${myProfile.age}` : ''}`
                      : user
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Community Member'
                      : 'Your Profile'}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    {myProfile?.highest_qualification || myProfile?.occupation
                      ? `${myProfile.highest_qualification || ''}${myProfile.occupation ? ` (${myProfile.occupation})` : ''}`
                      : 'Registered Member'}{' '}
                    • {myProfile?.current_city || 'Kolkata'}
                  </p>
                  <p className="text-xs text-crimson-800 font-semibold mt-0.5">
                    {myProfile?.community || user?.community || 'Sadgope Community'}
                    {myProfile?.sub_community ? ` (${myProfile.sub_community})` : ''}
                  </p>

                  <div className="mt-4 rounded-xl bg-white p-3.5 shadow-xs border border-slate-200 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                      <span>Profile Readiness</span>
                      <span className="text-crimson-700 font-extrabold text-sm">
                        {myProfile?.profile_completion_pct || 90}% Complete
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-crimson-700 rounded-full transition-all"
                        style={{ width: `${myProfile?.profile_completion_pct || 90}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      ✓ Mobile Verified • ✓ Active in {myProfile?.community || 'Community'} • Visible to compatible matches
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Link
                      to={myProfile?.id ? `/profile/${myProfile.id}` : (user?.profile_id ? `/profile/${user.profile_id}` : '/profile/8d18f513-5f7d-492a-80bd-6f55ebffdab3')}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-crimson-700 hover:text-crimson-800"
                    >
                      <span>View Full Profile</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      to="/profile/edit"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-navy-800 hover:text-navy-950"
                    >
                      <span>Edit Profile</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Profile Card Mockup matching reference image for visitors */
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-crimson-50/60 via-white to-navy-50/50 p-6 text-center border border-slate-100">
                  <div className="mx-auto mb-4 h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-crimson-700 p-1 shadow-xs overflow-hidden">
                    <img
                      src={getDefaultAvatar('FEMALE')}
                      alt="Verified Member"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>

                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-crimson-50 px-3 py-1 text-xs font-semibold text-crimson-800 border border-crimson-200 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-crimson-700" />
                    <span>Verified & Trusted Member</span>
                  </div>

                  <h3 className="text-xl font-bold text-navy-950 font-serif">Priyanka Ghosh, 26</h3>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    M.Tech (Software Engineer) • Kolkata / Bardhaman
                  </p>
                  <p className="text-xs text-crimson-800 font-semibold mt-0.5">
                    Sadgope Community (Kulin)
                  </p>

                  <div className="mt-4 rounded-xl bg-white p-3 shadow-xs border border-slate-200 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                      <span>Community Match Score</span>
                      <span className="text-crimson-700 font-extrabold text-sm">94% Match</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-crimson-700 w-[94%] rounded-full" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      ✓ Community & Sub-caste aligned • ✓ Education matches • ✓ Native region matches
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Quote Banner */}
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center border border-slate-200/60">
                <p className="text-xs font-medium text-slate-700 italic">
                  “Parampara Se Rishton Tak — Dedicated to Sadgope & Gowala families across India.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

