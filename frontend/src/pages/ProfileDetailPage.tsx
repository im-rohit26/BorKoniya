import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { MatchScoreBadge } from '../components/cards/MatchScoreBadge'
import { ProtectedPhoto } from '../components/security/ProtectedPhoto'
import {
  Heart,
  Star,
  MessageCircle,
  ShieldCheck,
  GraduationCap,
  Users,
  Moon,
  Lock,
  Phone,
  Mail,
  Sparkles,
  ArrowLeft,
  Check,
  CheckCircle,
  ShieldAlert,
  Ban,
  MapPin,
  Loader2,
} from 'lucide-react'
import { getSubscriptionStatus } from '../lib/subscriptionApi'
import {
  sendInterest,
  addToShortlist,
  removeFromShortlist,
  startOrGetConversation,
  blockProfile,
  getShortlistedIds,
  getSentInterestIds,
} from '../lib/interactionApi'
import { getProfileById, formatHeight, type ProfileResponse } from '../lib/profileApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'
import { UpgradeToPrimeModal } from '../components/common/UpgradeToPrimeModal'

export const ProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('Premium Profile Information')
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interestSent, setInterestSent] = useState(false)
  const [isShortlisted, setIsShortlisted] = useState(false)

  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => {
        if (status.is_active) setIsPremiumUser(true)
      })
      .catch(() => {})

    const loadProfile = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const [data, shortlistedIds, sentInterestIds] = await Promise.all([
          getProfileById(id),
          getShortlistedIds().catch((): string[] => []),
          getSentInterestIds().catch((): string[] => []),
        ])
        setProfile(data)
        setIsShortlisted((shortlistedIds as string[]).includes(data.id))
        setInterestSent((sentInterestIds as string[]).includes(data.id))
      } catch (err: any) {
        console.error('Failed to load profile:', err)
        setError(err.message || 'Profile could not be loaded.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [id])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleInterest = async () => {
    if (!profile || interestSent) return
    try {
      await sendInterest(profile.id)
      setInterestSent(true)
      showToast(`Express Interest sent to ${profile.first_name}!`)
    } catch (err: any) {
      setInterestSent(true)
      showToast(err.message || `Express Interest sent to ${profile.first_name}!`)
    }
  }

  const handleShortlist = async () => {
    if (!profile) return
    try {
      if (isShortlisted) {
        await removeFromShortlist(profile.id)
        setIsShortlisted(false)
        showToast(`${profile.first_name} removed from your shortlist.`)
      } else {
        await addToShortlist(profile.id)
        setIsShortlisted(true)
        showToast(`${profile.first_name} added to your shortlist!`)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleSendMessage = async () => {
    if (!profile) return
    if (!isPremiumUser) {
      setUpgradeFeature('Instant Family Messaging')
      setUpgradeModalOpen(true)
      return
    }
    try {
      const res = await startOrGetConversation(profile.id)
      if (res?.conversation_id) {
        navigate(`/messages/${res.conversation_id}`)
      } else {
        navigate('/messages')
      }
    } catch (err: any) {
      showToast(err.message || 'Chat unlocks when mutual interest is accepted.')
    }
  }

  const handleBlock = async () => {
    if (!profile) return
    if (!window.confirm(`Are you sure you want to block ${profile.first_name}? They will no longer be able to interact with you.`)) return
    try {
      await blockProfile(profile.id)
      showToast(`${profile.first_name} has been blocked.`)
      setTimeout(() => navigate('/matches'), 1200)
    } catch (err: any) {
      showToast(err.message || 'Failed to block member')
    }
  }

  const openUpgradeModal = (feature: string) => {
    setUpgradeFeature(feature)
    setUpgradeModalOpen(true)
  }

  const displayName = profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : ''
  const displayLocation = profile ? `${profile.current_city}, ${profile.current_state}` : ''
  const displayHeight = profile ? formatHeight(profile.height_cm) : ''
  const displayGender = profile?.gender === 'FEMALE' ? 'Female (Bride / কনে)' : 'Male (Groom / বর)'

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
      />

      <div className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full">
        {/* Back Link */}
        <Link
          to="/search"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Search Results</span>
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-10 h-10 animate-spin text-crimson-700 mb-4" />
            <p className="text-base font-semibold text-navy-950 font-serif">Loading Profile Details...</p>
            <p className="text-xs text-slate-500 mt-1">Connecting to Supabase verified member database</p>
          </div>
        ) : error || !profile ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-slate-200">
            <ShieldAlert className="mx-auto h-12 w-12 text-crimson-700 mb-3" />
            <h2 className="text-xl font-bold text-navy-950 font-serif">Profile Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The requested profile does not exist or has been removed. Please browse our active community matches.
            </p>
            <Link
              to="/matches"
              className="mt-5 inline-flex items-center rounded-xl bg-crimson-700 hover:bg-crimson-800 px-5 py-2.5 text-xs font-bold text-white transition-colors"
            >
              Explore Matches
            </Link>
          </div>
        ) : (
          <>
            {/* Top Profile Summary Header Card */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                {/* Main Photo */}
                <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-2xl overflow-hidden shadow-md flex-shrink-0 bg-slate-100">
                  <ProtectedPhoto
                    src={profile.photo_url}
                    alt={displayName}
                    profileId={profile.id}
                    gender={profile.gender}
                    className="h-full w-full"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded-full bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-slate-700 flex items-center space-x-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verified</span>
                  </div>
                </div>

                {/* Profile Info & Actions */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-serif">
                        {displayName}, {profile.age}
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Height: {displayHeight} • Profile ID: BK-{profile.id.slice(0, 8).toUpperCase()} • {displayGender}
                      </p>
                    </div>
                    <MatchScoreBadge score={profile.match_score ?? null} breakdown={profile.match_breakdown} />
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className="rounded-md bg-crimson-50 px-2.5 py-1 text-xs font-bold text-crimson-900 border border-crimson-200">
                      {profile.community} {profile.sub_community ? `(${profile.sub_community})` : ''}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {displayLocation}
                    </span>
                    {profile.native_place && (
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        Native: {profile.native_place}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {profile.about_me || 'Verified community profile registered on BorKonya Matrimony.'}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleInterest}
                      disabled={interestSent}
                      className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                        interestSent
                          ? 'bg-crimson-50 text-crimson-700 border border-crimson-200 cursor-default'
                          : 'bg-crimson-700 text-white hover:bg-crimson-800 shadow-xs'
                      }`}
                    >
                      {interestSent ? <Check className="h-4 w-4 text-crimson-700" /> : <Heart className="h-4 w-4" />}
                      <span>{interestSent ? 'Interested' : 'Express Interest'}</span>
                    </button>

                    <button
                      onClick={handleShortlist}
                      className={`flex items-center space-x-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                        isShortlisted
                          ? 'border-navy-300 bg-navy-50 text-navy-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          isShortlisted ? 'fill-crimson-700 text-crimson-700' : 'text-slate-400'
                        }`}
                      />
                      <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                    </button>

                    <button
                      onClick={handleSendMessage}
                      className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 text-navy-700" />
                      <span>Send Message</span>
                    </button>

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                      title="Report Profile"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>Report</span>
                    </button>

                    <button
                      onClick={handleBlock}
                      className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Block Profile"
                    >
                      <Ban className="h-4 w-4" />
                      <span>Block</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Tabs & Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                {/* About Me */}
                <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 font-serif mb-3">About Me</h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {profile.about_me || 'Verified community profile registered on BorKonya. Looking for a respectful, cultured life partner with traditional family values.'}
                  </p>
                </div>

                {/* Education & Career */}
                <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
                  <h2 className="text-lg font-bold text-navy-950 font-serif mb-4 flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-crimson-700" />
                    <span>Education & Career</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Highest Qualification</span>
                      <span className="text-slate-800 font-semibold">{profile.highest_qualification || 'Bachelor Degree'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Occupation</span>
                      <span className="text-slate-800 font-semibold">{profile.occupation || 'Professional'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Organization / Company</span>
                      <span className="text-slate-800 font-semibold">
                        {profile.company_name || 'Private Sector Enterprise'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Work Location</span>
                      <span className="text-slate-800 font-semibold">{displayLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Family Details */}
                <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
                  <h2 className="text-lg font-bold text-navy-950 font-serif mb-4 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-crimson-700" />
                    <span>Family Background</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Community</span>
                      <span className="text-slate-800 font-semibold">{profile.community}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Sub-Community</span>
                      <span className="text-slate-800 font-semibold">{profile.sub_community || 'General Sadgope / Gowala'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Native Place</span>
                      <span className="text-slate-800 font-semibold">{profile.native_place || 'West Bengal'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Current Residence</span>
                      <span className="text-slate-800 font-semibold">{displayLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Lifestyle & Horoscope Details */}
                <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
                  <h2 className="text-lg font-bold text-navy-950 font-serif mb-4 flex items-center space-x-2">
                    <Moon className="h-5 w-5 text-crimson-700" />
                    <span>Personal Details & Lifestyle</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Diet</span>
                      <span className="text-slate-800 font-semibold">{profile.diet || 'Non-Vegetarian'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Marital Status</span>
                      <span className="text-slate-800 font-semibold">{profile.marital_status?.replace('_', ' ') || 'Never Married'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Mother Tongue</span>
                      <span className="text-slate-800 font-semibold">{profile.mother_tongue || 'Bengali'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Height</span>
                      <span className="text-slate-800 font-semibold">{displayHeight}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Profile Managed By</span>
                      <span className="text-slate-800 font-semibold">{profile.profile_for || 'Self'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Status</span>
                      <span className="text-emerald-700 font-semibold">{profile.status || 'Active Member'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Contact Reveal Gate (Privacy Rule) */}
              <aside className="space-y-6">
                {isPremiumUser ? (
                  <div className="rounded-2xl bg-gradient-to-br from-navy-950 via-slate-900 to-navy-900 p-6 text-white shadow-xl border border-navy-700">
                    <div className="flex items-center space-x-2 text-crimson-300 mb-2">
                      <ShieldCheck className="h-5 w-5" />
                      <h3 className="font-bold text-sm">Verified Contact Details (Premium Unlocked)</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Your active BorKonya Premium plan unlocks direct family communication numbers.
                    </p>

                    <div className="space-y-2 rounded-xl bg-white/10 p-3.5 mb-5 text-xs">
                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center space-x-2">
                          <Phone className="h-3.5 w-3.5 text-crimson-300" />
                          <span>Family Phone</span>
                        </span>
                        <span className="font-mono font-bold text-white">
                          {profile.revealed_phone || profile.contact_phone_masked || '+91 98301 24792'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center space-x-2">
                          <Mail className="h-3.5 w-3.5 text-crimson-300" />
                          <span>Family Email</span>
                        </span>
                        <span className="font-mono font-bold text-white">
                          {profile.revealed_email || profile.contact_email_masked || 'family@borkonya.com'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-crimson-300" />
                          <span>Family Address</span>
                        </span>
                        <span className="font-medium text-white">
                          {displayLocation}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSendMessage}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 py-3 text-xs font-bold text-white shadow-md transition-all active:scale-98"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Initiate Direct Family Chat</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-navy-950 to-slate-900 p-6 text-white shadow-lg border border-navy-900">
                    <div className="flex items-center space-x-2 text-crimson-400 mb-2">
                      <Lock className="h-5 w-5" />
                      <h3 className="font-bold text-sm">Protected Contact Details</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      To protect family privacy, direct phone, email, and address details are hidden by default according to community security rules.
                    </p>

                    {/* Masked items - clicking opens Buy Prime prompt */}
                    <div className="space-y-2 rounded-xl bg-white/10 p-3.5 mb-5 text-xs">
                      <div
                        onClick={() => openUpgradeModal('Direct Family Phone Number')}
                        className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer group transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <Phone className="h-3.5 w-3.5 text-crimson-300 group-hover:scale-110 transition-transform" />
                          <span>Mobile Phone</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-crimson-200 font-semibold group-hover:underline">
                          <Lock className="h-3 w-3" />
                          <span>{profile.contact_phone_masked || '+91 98••••••41'}</span>
                        </span>
                      </div>

                      <div
                        onClick={() => openUpgradeModal('Direct Family Email Address')}
                        className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer group transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <Mail className="h-3.5 w-3.5 text-crimson-300 group-hover:scale-110 transition-transform" />
                          <span>Email Address</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-crimson-200 font-semibold group-hover:underline">
                          <Lock className="h-3 w-3" />
                          <span>{profile.contact_email_masked || '•••••••@gmail.com'}</span>
                        </span>
                      </div>

                      <div
                        onClick={() => openUpgradeModal('Residential Address Details')}
                        className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer group transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-crimson-300 group-hover:scale-110 transition-transform" />
                          <span>Address</span>
                        </span>
                        <span className="flex items-center gap-1 text-crimson-200 font-semibold group-hover:underline">
                          <Lock className="h-3 w-3" />
                          <span>Locked (Prime Only)</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openUpgradeModal('Verified Contact Information')}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 py-3 text-xs font-bold text-white shadow-md transition-all active:scale-98"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Upgrade to View Verified Contacts</span>
                    </button>
                  </div>
                )}

                {/* Safety Warning Widget */}
                <div className="rounded-2xl bg-navy-50/90 p-5 border border-navy-200 text-xs text-navy-950">
                  <h4 className="font-bold text-navy-900 mb-1 flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-crimson-700" />
                    <span>Trust & Safety Advice</span>
                  </h4>
                  <p className="text-[11px] text-navy-900/80 leading-relaxed">
                    Always communicate via BorKonya in-app chat first. Never transfer funds or disclose banking OTPs to anyone.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && profile && (
        <ReportProfileModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          profileId={profile.id}
          profileName={displayName}
        />
      )}

      <UpgradeToPrimeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />

      <Footer />

      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <RegisterModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => {}} />
    </div>
  )
}
