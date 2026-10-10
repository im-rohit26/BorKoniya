import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { ProfileCard, type ProfileCardData } from '../components/cards/ProfileCard'
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
  getShortlist,
  startOrGetConversation,
} from '../lib/interactionApi'
import {
  getRecommendedMatches,
  getNewMatches,
  getNearYouMatches,
  getProfileVisitors,
  mapProfileResponseToCard,
} from '../lib/profileApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'
import { UpgradeToPrimeModal } from '../components/common/UpgradeToPrimeModal'
import { useAuth } from '../context/AuthContext'
import { useMasterData, useInteractionStatus, useUserSubscription } from '../hooks/useSharedData'
import { invalidateInteractionCache } from '../lib/queryClient'
import { ProfileGridSkeleton } from '../components/skeletons'
import { RotateCcw } from 'lucide-react'

type MatchTabId = 'recommended' | 'new' | 'near_you' | 'visitors' | 'shortlist'

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<MatchTabId>('recommended')
  const [sortBy, setSortBy] = useState<'score' | 'age_asc' | 'age_desc'>('score')
  
  // Filter States
  const [filterCommunity, setFilterCommunity] = useState('ALL')
  const [filterState, setFilterState] = useState('ALL')
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('ALL')
  const [filterDiet, setFilterDiet] = useState('ALL')

  // Master Data & Interaction Status via central query cache
  const { communities, states, maritalStatuses, dietOptions } = useMasterData()
  const { shortlistedSet, sentInterestSet, connectedSet } = useInteractionStatus()
  const { isPremium: isPremiumUser } = useUserSubscription()

  const [tabProfiles, setTabProfiles] = useState<Record<MatchTabId, ProfileCardData[]>>({
    recommended: [],
    new: [],
    near_you: [],
    visitors: [],
    shortlist: [],
  })
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('Direct Family Messaging')

  // Fetch real matches for active category only with filters applied
  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    const fetchActiveCategory = async () => {
      try {
        const filters: Record<string, any> = {}
        if (filterCommunity && filterCommunity !== 'ALL') filters.community = filterCommunity
        if (filterState && filterState !== 'ALL') filters.state = filterState
        if (filterMaritalStatus && filterMaritalStatus !== 'ALL') filters.marital_status = filterMaritalStatus
        if (filterDiet && filterDiet !== 'ALL') filters.diet = filterDiet

        const mapList = (list: any[]) =>
          list.map((p) =>
            mapProfileResponseToCard(p, shortlistedSet.has(p.id), sentInterestSet.has(p.id), connectedSet.has(p.id))
          )

        if (activeTab === 'shortlist') {
          const shortlistItems = isAuthenticated ? await getShortlist().catch(() => []) : []
          const mappedShortlist = shortlistItems
            .filter((item) => item?.profile)
            .map((item) =>
              mapProfileResponseToCard(
                item.profile,
                true,
                sentInterestSet.has(item.profile.id),
                connectedSet.has(item.profile.id)
              )
            )
          if (!isCancelled) {
            setTabProfiles((prev) => ({ ...prev, shortlist: mappedShortlist }))
          }
        } else {
          let rawList: any[] = []
          if (activeTab === 'recommended') {
            rawList = await getRecommendedMatches(20, filters, 1).catch(() => [])
          } else if (activeTab === 'new') {
            rawList = await getNewMatches(20, filters, 1).catch(() => [])
          } else if (activeTab === 'near_you') {
            rawList = await getNearYouMatches(20, filters, 1).catch(() => [])
          } else if (activeTab === 'visitors') {
            rawList = await getProfileVisitors(20, filters, 1).catch(() => [])
          }

          if (!isCancelled) {
            setTabProfiles((prev) => ({
              ...prev,
              [activeTab]: mapList(rawList),
            }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchActiveCategory()
    return () => {
      isCancelled = true
    }
  }, [activeTab, filterCommunity, filterState, filterMaritalStatus, filterDiet, isAuthenticated])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleInterest = async (id: string, name: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      throw new Error('Please login to express interest')
    }
    try {
      await sendInterest(id)
      setTabProfiles((prev) => {
        const updateList = (list: ProfileCardData[]) =>
          list.map((p) => (p.id === id ? { ...p, isInterestSent: true } : p))
        return {
          recommended: updateList(prev.recommended),
          new: updateList(prev.new),
          near_you: updateList(prev.near_you),
          visitors: updateList(prev.visitors),
          shortlist: updateList(prev.shortlist),
        }
      })
      showToast(`Express Interest sent to ${name}!`)
      invalidateInteractionCache()
    } catch (err: any) {
      showToast(err.message || 'Interest sent successfully!')
      throw err
    }
  }

  const handleToggleShortlist = async (id: string, name: string, isCurrentlyShortlisted?: boolean) => {
    if (!isAuthenticated) {
      navigate('/login')
      throw new Error('Please login to shortlist profiles')
    }
    try {
      if (isCurrentlyShortlisted) {
        await removeFromShortlist(id)
        setTabProfiles((prev) => {
          const updateList = (list: ProfileCardData[]) =>
            list.map((p) => (p.id === id ? { ...p, isShortlisted: false } : p))
          return {
            recommended: updateList(prev.recommended),
            new: updateList(prev.new),
            near_you: updateList(prev.near_you),
            visitors: updateList(prev.visitors),
            shortlist: prev.shortlist.filter((p) => p.id !== id),
          }
        })
        showToast(`${name} removed from shortlist.`)
      } else {
        await addToShortlist(id)
        setTabProfiles((prev) => {
          const allCards = [
            ...prev.recommended,
            ...prev.new,
            ...prev.near_you,
            ...prev.visitors,
          ]
          const targetCard = allCards.find((p) => p.id === id)
          const updateList = (list: ProfileCardData[]) =>
            list.map((p) => (p.id === id ? { ...p, isShortlisted: true } : p))
          const nextShortlist =
            targetCard && !prev.shortlist.some((p) => p.id === id)
              ? [{ ...targetCard, isShortlisted: true }, ...prev.shortlist]
              : updateList(prev.shortlist)

          return {
            recommended: updateList(prev.recommended),
            new: updateList(prev.new),
            near_you: updateList(prev.near_you),
            visitors: updateList(prev.visitors),
            shortlist: nextShortlist,
          }
        })
        showToast(`${name} added to shortlist!`)
      }
      invalidateInteractionCache()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }

  const handleBlock = async (id: string, name: string) => {
    if (!window.confirm(`Block ${name}? They will be removed from your matches.`)) return
    try {
      await blockProfile(id)
      setTabProfiles((prev) => {
        const filterList = (list: ProfileCardData[]) => list.filter((p) => p.id !== id)
        return {
          recommended: filterList(prev.recommended),
          new: filterList(prev.new),
          near_you: filterList(prev.near_you),
          visitors: filterList(prev.visitors),
          shortlist: filterList(prev.shortlist),
        }
      })
      showToast(`${name} has been blocked.`)
    } catch (err: any) {
      alert(err.message || 'Failed to block member')
    }
  }

  const handleStartMessage = async (profileId: string) => {
    if (!isPremiumUser) {
      setUpgradeFeature('Instant Family Messaging')
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

  const handleResetFilters = () => {
    setFilterCommunity('ALL')
    setFilterState('ALL')
    setFilterMaritalStatus('ALL')
    setFilterDiet('ALL')
  }

  // Select profiles for active tab
  let displayProfiles = [...(tabProfiles[activeTab] || [])]

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
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-navy-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 border border-crimson-400/40">
          <CheckCircle className="w-5 h-5 text-crimson-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
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
            <div className="inline-flex items-center space-x-1.5 rounded-md bg-crimson-50 px-2.5 py-1 text-xs font-bold text-crimson-800 border border-crimson-200 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-crimson-700" />
              <span>Rule-Based Compatibility Matchmaking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-serif">
              Match Discovery Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Matches curated according to age, community lineage, location, education, and lifestyle
            </p>
          </div>

          {/* Sort Control */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-crimson-700"
            >
              <option value="score">Highest Match Score (90%+)</option>
              <option value="age_asc">Age: Youngest First</option>
              <option value="age_desc">Age: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Real Backend Match Filter Bar */}
        <div className="mb-6 rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-navy-950 mr-1">
            <Filter className="h-4 w-4 text-crimson-700" />
            <span>Filters:</span>
          </div>

          {/* Community Filter */}
          <select
            value={filterCommunity}
            onChange={(e) => setFilterCommunity(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-crimson-700"
          >
            <option value="ALL">All Communities</option>
            {communities.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* State Filter */}
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-crimson-700"
          >
            <option value="ALL">All Locations</option>
            {states.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Marital Status Filter */}
          <select
            value={filterMaritalStatus}
            onChange={(e) => setFilterMaritalStatus(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-crimson-700"
          >
            <option value="ALL">All Marital Statuses</option>
            {maritalStatuses.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Diet Filter */}
          <select
            value={filterDiet}
            onChange={(e) => setFilterDiet(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-crimson-700"
          >
            <option value="ALL">All Diets</option>
            {dietOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          {(filterCommunity !== 'ALL' || filterState !== 'ALL' || filterMaritalStatus !== 'ALL' || filterDiet !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="min-h-[44px] inline-flex items-center space-x-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {[
            { id: 'recommended', label: 'Recommended for You', icon: Sparkles, count: tabProfiles.recommended.length },
            { id: 'new', label: 'New Matches', icon: Users, count: tabProfiles.new.length },
            { id: 'near_you', label: 'Near You (WB & Odisha)', icon: MapPin, count: tabProfiles.near_you.length },
            { id: 'visitors', label: 'Who Viewed Me', icon: Eye, count: tabProfiles.visitors.length },
            { id: 'shortlist', label: 'Shortlisted', icon: Star, count: tabProfiles.shortlist.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MatchTabId)}
                className={`min-h-[44px] flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-crimson-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? 'bg-crimson-700 text-white' : 'bg-slate-100 text-slate-600'
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
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-crimson-900 p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-crimson-900">
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                <Lock className="h-6 w-6 text-crimson-300" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {tabProfiles.visitors.length} {tabProfiles.visitors.length === 1 ? 'Member' : 'Members'} Viewed Your Profile This Week
                </h3>
                <p className="text-xs text-slate-200 mt-0.5">
                  Upgrade to BorKonya Premium to unlock who visited you and connect with them instantly.
                </p>
              </div>
            </div>
            <Link
              to="/subscription"
              className="rounded-xl bg-crimson-700 hover:bg-crimson-800 px-5 py-2.5 text-xs font-bold text-white shadow transition-all whitespace-nowrap"
            >
              Unlock Visitors &rarr;
            </Link>
          </div>
        )}

        {/* Profile Card List */}
        {loading && displayProfiles.length === 0 ? (
          <ProfileGridSkeleton count={6} layout="vertical" columnsClassName="grid grid-cols-1 md:grid-cols-2 gap-6" />
        ) : displayProfiles.length > 0 ? (
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
      <UpgradeToPrimeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />
    </div>
  )
}
