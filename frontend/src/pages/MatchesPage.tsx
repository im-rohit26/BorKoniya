import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { ProfileCard } from '../components/cards/ProfileCard'
import { DEMO_PROFILES } from '../data/mockProfiles'
import {
  Sparkles,
  Users,
  MapPin,
  Eye,
  Star,
  Lock,
  ArrowUpDown,
  Filter,
  CheckCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  sendInterest,
  addToShortlist,
  removeFromShortlist,
  blockProfile,
  getShortlistedIds,
  startOrGetConversation,
} from '../lib/interactionApi'
import { getSubscriptionStatus } from '../lib/subscriptionApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'recommended' | 'new' | 'near_you' | 'visitors' | 'shortlist'>('recommended')
  const [sortBy, setSortBy] = useState<'score' | 'age_asc' | 'age_desc'>('score')
  const [profiles, setProfiles] = useState(DEMO_PROFILES)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)

  // Sync subscription status and shortlisted state from database
  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => {
        if (status.is_active) setIsPremiumUser(true)
      })
      .catch(() => {})

    getShortlistedIds()
      .then((ids) => {
        if (ids && ids.length > 0) {
          const idSet = new Set(ids)
          setProfiles((prev) =>
            prev.map((p) => ({
              ...p,
              isShortlisted: idSet.has(p.id) || p.isShortlisted,
            }))
          )
        }
      })
      .catch((err) => console.log('Could not load shortlist ids:', err))
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleInterest = async (id: string, name: string) => {
    try {
      await sendInterest(id)
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isInterestSent: true } : p))
      )
      showToast(`Express Interest sent to ${name}!`)
    } catch (err: any) {
      showToast(err.message || 'Interest sent successfully!')
    }
  }

  const handleToggleShortlist = async (id: string, name: string, isCurrentlyShortlisted?: boolean) => {
    try {
      if (isCurrentlyShortlisted) {
        await removeFromShortlist(id)
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isShortlisted: false } : p))
        )
        showToast(`${name} removed from shortlist.`)
      } else {
        await addToShortlist(id)
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isShortlisted: true } : p))
        )
        showToast(`${name} added to shortlist!`)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleBlock = async (id: string, name: string) => {
    if (!window.confirm(`Block ${name}? They will be removed from your matches.`)) return
    try {
      await blockProfile(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      showToast(`${name} has been blocked.`)
    } catch (err: any) {
      alert(err.message || 'Failed to block member')
    }
  }

  const handleStartMessage = async (profileId: string) => {
    try {
      const res = await startOrGetConversation(profileId)
      if (res?.conversation_id) {
        navigate(`/messages/${res.conversation_id}`)
      } else {
        navigate('/messages')
      }
    } catch (err: any) {
      showToast(err.message || 'Chat unlocks when mutual interest is accepted.')
    }
  }

  // Filter profiles according to active tab
  let displayProfiles = [...profiles]

  if (activeTab === 'near_you') {
    displayProfiles = displayProfiles.filter(
      (p) => p.location.includes('Kolkata') || p.location.includes('Bhubaneswar')
    )
  } else if (activeTab === 'shortlist') {
    displayProfiles = displayProfiles.filter((p) => p.isShortlisted)
  }

  // Sort profiles
  if (sortBy === 'age_asc') {
    displayProfiles.sort((a, b) => a.age - b.age)
  } else if (sortBy === 'age_desc') {
    displayProfiles.sort((a, b) => b.age - a.age)
  } else {
    displayProfiles.sort((a, b) => b.matchScore - a.matchScore)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      {reportModalData && (
        <ReportProfileModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          profileId={reportModalData.id}
          profileName={reportModalData.name}
        />
      )}

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Rule-Based Compatibility Matchmaking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
              Match Discovery Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Matches curated according to age, community lineage, location, education, and lifestyle
            </p>
          </div>

          {/* Sort Control */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="score">Highest Match Score (90%+)</option>
              <option value="age_asc">Age: Youngest First</option>
              <option value="age_desc">Age: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {[
            { id: 'recommended', label: 'Recommended for You', icon: Sparkles, count: profiles.length },
            { id: 'new', label: 'New Matches', icon: Users, count: 4 },
            { id: 'near_you', label: 'Near You (WB & Odisha)', icon: MapPin, count: 2 },
            { id: 'visitors', label: 'Who Viewed Me', icon: Eye, count: 8 },
            { id: 'shortlist', label: 'Shortlisted', icon: Star, count: profiles.filter(p => p.isShortlisted).length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Premium Gating Teaser for Profile Visitors */}
        {activeTab === 'visitors' && !isPremiumUser && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">8 Members Viewed Your Profile This Week</h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Upgrade to BorKonya Premium to unlock who visited you and connect with them instantly.
                </p>
              </div>
            </div>
            <Link
              to="/subscription"
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-900 hover:bg-amber-50 shadow transition-all whitespace-nowrap"
            >
              Unlock Visitors &rarr;
            </Link>
          </div>
        )}

        {/* Profile Card List */}
        {displayProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onExpressInterest={() => handleInterest(profile.id, profile.name)}
                onToggleShortlist={() => handleToggleShortlist(profile.id, profile.name, profile.isShortlisted)}
                onMessage={() => handleStartMessage(profile.id)}
                onReport={() => setReportModalData({ id: profile.id, name: profile.name })}
                onBlock={() => handleBlock(profile.id, profile.name)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200">
            <Filter className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No matches in this category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try exploring the Recommended tab or broadening your partner location preferences.
            </p>
          </div>
        )}
      </main>

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  )
}
