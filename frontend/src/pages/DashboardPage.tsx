import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { ProfileCard, type ProfileCardData } from '../components/cards/ProfileCard'
import {
  Sparkles,
  Heart,
  Star,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  sendInterest,
  addToShortlist,
  removeFromShortlist,
  getShortlistedIds,
  getSentInterestIds,
  getConnectedProfileIds,
  startOrGetConversation,
} from '../lib/interactionApi'
import { getDefaultAvatar } from '../lib/utils'
import { getSubscriptionStatus } from '../lib/subscriptionApi'
import {
  getDashboardStats,
  mapProfileResponseToCard,
  type DashboardStatsResponse,
} from '../lib/profileApi'
import { UpgradeToPrimeModal } from '../components/common/UpgradeToPrimeModal'
import { useAuth } from '../context/AuthContext'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [matches, setMatches] = useState<ProfileCardData[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardStatsResponse | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let isCancelled = false
    setLoadingMatches(true)

    const fetchDashboard = async () => {
      try {
        const [dash, sub, sIds, sentIds, connIds] = await Promise.all([
          getDashboardStats().catch(() => null),
          getSubscriptionStatus().catch(() => null),
          getShortlistedIds().catch(() => []),
          getSentInterestIds().catch(() => []),
          getConnectedProfileIds().catch(() => []),
        ])

        if (isCancelled) return

        if (sub?.is_active) setIsPremiumUser(true)

        if (dash) {
          setDashboardData(dash)
          const sSet = new Set(sIds)
          const sentSet = new Set(sentIds)
          const connSet = new Set(connIds)
          const recProfiles = dash.recommended_profiles || (dash as any).top_matches || []
          const mapped = recProfiles.map((p) =>
            mapProfileResponseToCard(p, sSet.has(p.id), sentSet.has(p.id), connSet.has(p.id))
          )
          setMatches(mapped)
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        if (!isCancelled) {
          setLoadingMatches(false)
        }
      }
    }

    fetchDashboard()
    return () => {
      isCancelled = true
    }
  }, [user?.user_id])

  const handleInterest = async (id: string, name: string) => {
    try {
      await sendInterest(id)
      setMatches((prev) =>
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
        setMatches((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isShortlisted: false } : p))
        )
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                metrics: {
                  ...prev.metrics,
                  shortlist_count: Math.max(0, prev.metrics.shortlist_count - 1),
                },
              }
            : null
        )
        showToast(`${name} removed from shortlist.`)
      } else {
        await addToShortlist(id)
        setMatches((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isShortlisted: true } : p))
        )
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                metrics: {
                  ...prev.metrics,
                  shortlist_count: prev.metrics.shortlist_count + 1,
                },
              }
            : null
        )
        showToast(`${name} added to shortlist!`)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleStartMessage = async (profileId: string) => {
    if (!isPremiumUser) {
      setUpgradeModalOpen(true)
      return
    }
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

  const completionPct =
    dashboardData?.metrics?.profile_completion_pct ??
    (user as any)?.profile_completion_pct ??
    0
  const displayName = dashboardData?.user?.first_name
    ? `${dashboardData.user.first_name} ${dashboardData.user.last_name || ''}`.trim()
    : user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Valued Member'
  const communityDisplay = dashboardData?.user?.community
    ? `${dashboardData.user.community} Community`
    : user?.community
    ? `${user.community} Community`
    : 'Sadgope / Gowala Community'
  const profileIdDisplay = `BK-${(user?.profile_id || '0000').slice(-4).toUpperCase()}`

  const recommendedCount = dashboardData?.metrics?.recommended_count ?? matches.length
  const interestsCount =
    (dashboardData?.metrics?.received_interests_count ?? 0) +
    (dashboardData?.metrics?.sent_interests_count ?? 0)
  const shortlistedCount = dashboardData?.metrics?.shortlist_count ?? 0
  const messagesCount =
    dashboardData?.metrics?.active_conversations_count ??
    dashboardData?.metrics?.total_active_connections ??
    0

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />

      <div className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner & Profile Completion Meter */}
        <div className="rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 sm:p-8 text-white shadow-md mb-8 border border-navy-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-crimson-400 bg-white/10 shadow-md flex-shrink-0">
                <img
                  src={dashboardData?.user?.photo_url || user?.photo_url || getDefaultAvatar(dashboardData?.user?.gender || user?.gender)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget
                    const fallback = getDefaultAvatar(dashboardData?.user?.gender || user?.gender)
                    if (target.src !== fallback) target.src = fallback
                  }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-crimson-400">Welcome Back 👋</span>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif">
                  {displayName}
                </h1>
                <p className="text-xs text-slate-300">
                  {communityDisplay} • Profile ID: {profileIdDisplay}
                </p>
              </div>
            </div>

            {/* Completion Meter */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 sm:p-5 border border-white/10 w-full md:w-80">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span>Profile Completion</span>
                <span className="text-crimson-300">{completionPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-crimson-600 to-crimson-400"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Add Family Horoscope (+15%)</span>
                <Link to="/profile/edit" className="text-crimson-300 font-semibold underline hover:text-white">
                  Complete Now
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid with Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => navigate('/matches')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-crimson-50/50 hover:border-crimson-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Recommended</span>
              <Sparkles className="h-4 w-4 text-crimson-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-navy-950">{recommendedCount}</div>
            <p className="text-[11px] text-crimson-700 font-medium mt-1">Explore Matches &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/interests')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-crimson-50/50 hover:border-crimson-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Interests</span>
              <Heart className="h-4 w-4 text-crimson-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-navy-950">
              {interestsCount}
            </div>
            <p className="text-[11px] text-crimson-700 font-medium mt-1">Manage Requests &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/shortlist')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-navy-50/50 hover:border-navy-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Shortlisted</span>
              <Star className="h-4 w-4 text-navy-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-navy-950">{shortlistedCount}</div>
            <p className="text-[11px] text-navy-800 font-medium mt-1">View Saved Profiles &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/messages')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-navy-50/50 hover:border-navy-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Messages</span>
              <MessageSquare className="h-4 w-4 text-navy-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-navy-950">{messagesCount}</div>
            <p className="text-[11px] text-navy-800 font-medium mt-1">Open Chat &rarr;</p>
          </div>
        </div>

        {/* Top Matches Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-navy-950 font-serif">
              Top Recommended Matches for You
            </h2>
            <Link
              to="/matches"
              className="text-xs font-bold text-crimson-700 hover:text-crimson-800 flex items-center gap-1"
            >
              <span>View All Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingMatches ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-crimson-700 mb-3" />
              <p className="text-sm font-medium">Loading recommendations from Supabase...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-white">
              <Sparkles className="mx-auto h-8 w-8 text-crimson-600 mb-2 opacity-80" />
              <h3 className="text-sm font-semibold text-navy-950">No Recommended Matches Right Now</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All eligible matches might be connected or pending. Explore all community members in Match Discovery.
              </p>
              <Link
                to="/matches"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-crimson-700 hover:text-crimson-800"
              >
                <span>Browse All Matches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.slice(0, 6).map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  layout="vertical"
                  onExpressInterest={() => handleInterest(profile.id, profile.name)}
                  onToggleShortlist={() => handleToggleShortlist(profile.id, profile.name, profile.isShortlisted)}
                  onMessage={() => handleStartMessage(profile.id)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <UpgradeToPrimeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName="Direct Family Messaging"
      />
    </div>
  )
}


