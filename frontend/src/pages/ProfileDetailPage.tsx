import React, { useState, useEffect } from 'react'

import { useParams, Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { DEMO_PROFILES } from '../data/mockProfiles'
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
} from 'lucide-react'
import { getSubscriptionStatus } from '../lib/subscriptionApi'
import { sendInterest, addToShortlist, removeFromShortlist, startOrGetConversation, blockProfile } from '../lib/interactionApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'

export const ProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const profile = DEMO_PROFILES.find((p) => p.id === id) || DEMO_PROFILES[0]
  const [interestSent, setInterestSent] = useState(profile.isInterestSent || false)
  const [isShortlisted, setIsShortlisted] = useState(profile.isShortlisted || false)

  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => {
        if (status.is_active) setIsPremiumUser(true)
      })
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleInterest = async () => {
    try {
      await sendInterest(profile.id)
      setInterestSent(true)
      showToast(`Express Interest sent to ${profile.name}!`)
    } catch (err: any) {
      setInterestSent(true)
      showToast(`Express Interest sent to ${profile.name}!`)
    }
  }

  const handleShortlist = async () => {
    try {
      if (isShortlisted) {
        await removeFromShortlist(profile.id)
        setIsShortlisted(false)
        showToast(`${profile.name} removed from your shortlist.`)
      } else {
        await addToShortlist(profile.id)
        setIsShortlisted(true)
        showToast(`${profile.name} added to your shortlist!`)
      }
    } catch (err: any) {
      setIsShortlisted(!isShortlisted)
    }
  }

  const handleSendMessage = async () => {
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
    if (!window.confirm(`Are you sure you want to block ${profile.name}? They will no longer be able to interact with you.`)) return
    try {
      await blockProfile(profile.id)
      showToast(`${profile.name} has been blocked.`)
      setTimeout(() => navigate('/matches'), 1200)
    } catch (err: any) {
      showToast(err.message || 'Failed to block member')
    }
  }

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

        {/* Top Profile Summary Header Card */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Main Photo */}
            <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-2xl overflow-hidden shadow-md flex-shrink-0 bg-slate-100">
              <ProtectedPhoto
                src={profile.photoUrl}
                alt={profile.name}
                profileId={profile.id}
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
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                    {profile.name}, {profile.age}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Height: {profile.height} • Profile ID: {profile.id}
                  </p>
                </div>
                <MatchScoreBadge score={profile.matchScore} breakdown={profile.matchBreakdown} />
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  {profile.community} {profile.subCommunity ? `(${profile.subCommunity})` : ''}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {profile.location}
                </span>
                {profile.nativePlace && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Native: {profile.nativePlace}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{profile.shortBio}</p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleInterest}
                  className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                    interestSent
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                  }`}
                >
                  {interestSent ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                  <span>{interestSent ? 'Interest Sent' : 'Express Interest'}</span>
                </button>

                <button
                  onClick={handleShortlist}
                  className={`flex items-center space-x-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                    isShortlisted
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      isShortlisted ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                    }`}
                  />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </button>

                <button
                  onClick={handleSendMessage}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-indigo-600" />
                  <span>Send Message</span>
                </button>

                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
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
              <p className="text-sm text-slate-700 leading-relaxed">{profile.shortBio}</p>
            </div>

            {/* Education & Career */}
            <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 font-serif mb-4 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-amber-600" />
                <span>Education & Career</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Highest Qualification</span>
                  <span className="text-slate-800 font-semibold">{profile.education}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Occupation</span>
                  <span className="text-slate-800 font-semibold">{profile.profession}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Organization / Company</span>
                  <span className="text-slate-800 font-semibold">
                    {profile.company || 'Private Sector Enterprise'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Work Location</span>
                  <span className="text-slate-800 font-semibold">{profile.location}</span>
                </div>
              </div>
            </div>

            {/* Family Details */}
            <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 font-serif mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-amber-600" />
                <span>Family Background</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Father's Occupation</span>
                  <span className="text-slate-800 font-semibold">Retired Govt Officer</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mother's Occupation</span>
                  <span className="text-slate-800 font-semibold">Homemaker</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Family Values</span>
                  <span className="text-slate-800 font-semibold">Traditional & Cultured</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Family Type</span>
                  <span className="text-slate-800 font-semibold">Nuclear Family</span>
                </div>
              </div>
            </div>

            {/* Optional Horoscope Details */}
            <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 font-serif mb-4 flex items-center space-x-2">
                <Moon className="h-5 w-5 text-amber-600" />
                <span>Horoscope (Optional / Configurable)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Rashi</span>
                  <span className="text-slate-800 font-semibold">Tula (Libra)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Nakshatra</span>
                  <span className="text-slate-800 font-semibold">Swati</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Manglik Status</span>
                  <span className="text-slate-800 font-semibold">No (Non-Manglik)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Contact Reveal Gate (Privacy Rule) */}
          <aside className="space-y-6">
            {isPremiumUser ? (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl border border-emerald-500/40">
                <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="font-bold text-sm">Verified Contact Details (Premium Unlocked)</h3>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed mb-4">
                  Your active BorKonya Premium plan unlocks direct family communication numbers.
                </p>

                <div className="space-y-2 rounded-xl bg-white/10 p-3.5 mb-5 text-xs">
                  <div className="flex items-center justify-between text-white">
                    <span className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Family Phone</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">+91 98301 24792</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <span className="flex items-center space-x-2">
                      <Mail className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Family Email</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">ghosh.family@gmail.com</span>
                  </div>
                </div>

                <button
                  onClick={handleSendMessage}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md transition-all active:scale-98"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Initiate Direct Family Chat</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-lg">
                <div className="flex items-center space-x-2 text-amber-400 mb-2">
                  <Lock className="h-5 w-5" />
                  <h3 className="font-bold text-sm">Protected Contact Details</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  To protect family privacy, direct phone and email details are hidden by default according to community security rules.
                </p>

                {/* Masked items */}
                <div className="space-y-2 rounded-xl bg-white/10 p-3.5 mb-5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 text-amber-400" />
                      <span>Mobile Phone</span>
                    </span>
                    <span className="font-mono text-slate-400">+91 98••••••41</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center space-x-2">
                      <Mail className="h-3.5 w-3.5 text-amber-400" />
                      <span>Email Address</span>
                    </span>
                    <span className="font-mono text-slate-400">p••••••@gmail.com</span>
                  </div>
                </div>

                <Link
                  to="/subscription"
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 py-3 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-98"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Upgrade to View Verified Contacts</span>
                </Link>
              </div>
            )}

            {/* Safety Warning Widget */}
            <div className="rounded-2xl bg-amber-50/80 p-5 border border-amber-200 text-xs text-amber-950">
              <h4 className="font-bold text-amber-900 mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Trust & Safety Advice</span>
              </h4>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Always communicate via BorKonya in-app chat first. Never transfer funds or disclose banking OTPs to anyone.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <ReportProfileModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          profileId={profile.id}
          profileName={profile.name}
        />
      )}

      <Footer />

      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <RegisterModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => {}} />
    </div>
  )
}
