import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { ProfileCard, type ProfileCardData } from '../components/cards/ProfileCard'
import { AdvancedSearchModal } from '../components/search/AdvancedSearchModal'
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  ShieldCheck,
  Utensils,
  Bookmark,
  ArrowUpDown,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  sendInterest,
  addToShortlist,
  removeFromShortlist,
  startOrGetConversation,
  blockProfile,
  getShortlistedIds,
  getSentInterestIds,
  getConnectedProfileIds,
} from '../lib/interactionApi'
import { getSubscriptionStatus } from '../lib/subscriptionApi'
import { getSearchProfilesWithTotal, mapProfileResponseToCard } from '../lib/profileApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'
import { UpgradeToPrimeModal } from '../components/common/UpgradeToPrimeModal'
import { useAuth } from '../context/AuthContext'
import { masterDataApi, type Community, type SelectOption } from '../lib/masterDataApi'

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false)
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('Instant Family Messaging')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  const [totalCount, setTotalCount] = useState(0)

  const { user, isAuthenticated } = useAuth()

  // Opposite-gender determination:
  // Females search for males (Groom), males search for females (Bride)
  const defaultTargetGender = user?.gender === 'FEMALE' ? 'MALE' : (user?.gender === 'MALE' ? 'FEMALE' : (searchParams.get('gender') || 'FEMALE'))

  // Filters State
  const [lookingFor, setLookingFor] = useState(defaultTargetGender)
  const [community, setCommunity] = useState('ALL')
  const [state, setState] = useState(searchParams.get('state') || 'ALL')
  const [education, setEducation] = useState(searchParams.get('education') || 'ALL')
  const [profession, setProfession] = useState(searchParams.get('profession') || 'ALL')
  const [maritalStatus, setMaritalStatus] = useState('ALL')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [diet, setDiet] = useState('ALL')
  const [sortBy, setSortBy] = useState<'score' | 'age_asc' | 'age_desc'>('score')

  useEffect(() => {
    if (user?.gender === 'FEMALE') {
      setLookingFor('MALE')
    } else if (user?.gender === 'MALE') {
      setLookingFor('FEMALE')
    }
  }, [user?.gender])

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState<any[]>([])

  const [communities, setCommunities] = useState<Community[]>([])
  const [states, setStates] = useState<SelectOption[]>([])
  const [maritalStatuses, setMaritalStatuses] = useState<SelectOption[]>([])
  const [dietOptions, setDietOptions] = useState<SelectOption[]>([])

  useEffect(() => {
    Promise.all([
      masterDataApi.getCommunities(),
      masterDataApi.getStates(),
      masterDataApi.getMaritalStatuses(),
      masterDataApi.getDietOptions(),
    ]).then(([comm, st, mar, diet]) => {
      setCommunities(comm)
      setStates(st)
      setMaritalStatuses(mar)
      setDietOptions(diet)
    }).catch(console.error)
  }, [])

  const [profiles, setProfiles] = useState<ProfileCardData[]>([])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Check subscription status on mount
  useEffect(() => {
    getSubscriptionStatus()
      .then((status) => {
        if (status.is_active) setIsPremiumUser(true)
      })
      .catch(() => {})
  }, [])

  // Fetch profiles from API based on filters & page
  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    const fetchProfiles = async () => {
      try {
        const filters: Record<string, any> = {}
        if (lookingFor && lookingFor !== 'ALL') filters.gender = lookingFor
        if (community && community !== 'ALL') filters.community = community
        if (state && state !== 'ALL' && state !== 'All India') filters.state = state
        if (maritalStatus && maritalStatus !== 'ALL') filters.marital_status = maritalStatus
        if (education && education !== 'ALL') filters.highest_qualification = education
        if (profession && profession !== 'ALL') filters.occupation = profession
        if (diet && diet !== 'ALL') filters.diet = diet

        const result = await getSearchProfilesWithTotal(filters, pageSize, currentPage)

        let shortlistedIds: string[] = []
        let sentInterestIds: string[] = []
        let connectedIds: string[] = []
        try {
          [shortlistedIds, sentInterestIds, connectedIds] = await Promise.all([
            getShortlistedIds().catch(() => []),
            getSentInterestIds().catch(() => []),
            getConnectedProfileIds().catch(() => []),
          ])
        } catch {
          shortlistedIds = []
          sentInterestIds = []
          connectedIds = []
        }
        const shortlistedSet = new Set(shortlistedIds)
        const sentInterestSet = new Set(sentInterestIds)
        const connectedSet = new Set(connectedIds)

        if (!isCancelled) {
          const mapped = result.profiles.map((p) =>
            mapProfileResponseToCard(
              p,
              shortlistedSet.has(p.id),
              sentInterestSet.has(p.id),
              connectedSet.has(p.id)
            )
          )
          setProfiles(mapped)
          setTotalCount(result.total)
        }
      } catch (err) {
        console.error('Failed to load search results:', err)
        if (!isCancelled) {
          setProfiles([])
          setTotalCount(0)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchProfiles()
    return () => {
      isCancelled = true
    }
  }, [lookingFor, community, state, maritalStatus, education, profession, diet, currentPage])

  // Reset page to 1 when criteria change
  useEffect(() => {
    setCurrentPage(1)
  }, [lookingFor, community, state, maritalStatus, education, profession, diet])

  const handleInterest = async (id: string, name: string) => {
    if (!isAuthenticated) {
      setRegisterModalOpen(true)
      throw new Error('Please login or register to express interest')
    }
    try {
      await sendInterest(id)
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isInterestSent: true } : p))
      )
      showToast(`Express Interest sent to ${name}!`)
    } catch (err: any) {
      showToast(err.message || 'Interest sent successfully!')
      throw err
    }
  }

  const handleToggleShortlist = async (id: string, name: string, isCurrentlyShortlisted?: boolean) => {
    if (!isAuthenticated) {
      setRegisterModalOpen(true)
      throw new Error('Please login or register to shortlist profiles')
    }
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
      throw err
    }
  }

  const handleResetFilters = () => {
    if (user?.gender === 'FEMALE') {
      setLookingFor('MALE')
    } else if (user?.gender === 'MALE') {
      setLookingFor('FEMALE')
    } else {
      setLookingFor('ALL')
    }
    setCommunity('ALL')
    setState('ALL')
    setEducation('ALL')
    setProfession('ALL')
    setMaritalStatus('ALL')
    setVerifiedOnly(false)
    setDiet('ALL')
    setSortBy('score')
  }

  const handleApplyAdvancedFilters = (adv: any) => {
    if (user?.gender === 'FEMALE') {
      setLookingFor('MALE')
    } else if (user?.gender === 'MALE') {
      setLookingFor('FEMALE')
    } else if (adv.lookingFor) {
      setLookingFor(adv.lookingFor)
    }
    setCommunity(adv.community)
    setState(adv.state)
    setMaritalStatus(adv.maritalStatus)
    setVerifiedOnly(adv.verifiedOnly)
    setDiet(adv.diet)
    if (adv.education) setEducation(adv.education)
    if (adv.profession) setProfession(adv.profession)
  }

  const handleSaveSearch = (name: string, filters: any) => {
    setSavedSearches([
      { id: `saved-${Date.now()}`, name, filters },
      ...savedSearches,
    ])
  }

  const handleLoadSavedSearch = (saved: any) => {
    if (user?.gender === 'FEMALE') {
      setLookingFor('MALE')
    } else if (user?.gender === 'MALE') {
      setLookingFor('FEMALE')
    } else if (saved.filters.lookingFor) {
      setLookingFor(saved.filters.lookingFor)
    }
    if (saved.filters.community) setCommunity(saved.filters.community)
    if (saved.filters.state) setState(saved.filters.state)
    if (saved.filters.maritalStatus) setMaritalStatus(saved.filters.maritalStatus)
    if (saved.filters.education) setEducation(saved.filters.education)
    if (saved.filters.profession) setProfession(saved.filters.profession)
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

  const handleBlock = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to block ${name}?`)) return
    try {
      await blockProfile(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      showToast(`${name} has been blocked.`)
    } catch (err: any) {
      alert(err.message || 'Failed to block member')
    }
  }

  let filteredProfiles = [...profiles]
  if (verifiedOnly) {
    filteredProfiles = filteredProfiles.filter((p) => p.isMobileVerified)
  }
  if (sortBy === 'age_asc') {
    filteredProfiles.sort((a, b) => a.age - b.age)
  } else if (sortBy === 'age_desc') {
    filteredProfiles.sort((a, b) => b.age - a.age)
  } else {
    filteredProfiles.sort((a, b) => b.matchScore - a.matchScore)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
      />

      <div className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full">
        {/* Page Title & Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-serif">
              Matrimonial Search Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Showing {totalCount > 0 ? `${totalCount} verified matrimonial profiles` : `${filteredProfiles.length} verified matrimonial profiles`} for the Sadgope & Gowala community
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Advanced Search Trigger */}
            <button
              onClick={() => setAdvancedModalOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-crimson-700 hover:bg-crimson-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-crimson-100" />
              <span>Advanced Filters</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="score">Sort: Compatibility (90%+)</option>
                <option value="age_asc">Sort: Age (Youngest)</option>
                <option value="age_desc">Sort: Age (Oldest)</option>
              </select>
            </div>

            <button
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Saved Searches Quick Presets Bar */}
        {savedSearches.length > 0 && (
          <div className="mb-6 rounded-2xl bg-crimson-50/70 p-3.5 border border-crimson-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-crimson-950 font-bold">
              <Bookmark className="h-4 w-4 text-crimson-700" />
              <span>Saved Search Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedSearches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSavedSearch(s)}
                  className="rounded-lg bg-white px-3 py-1 font-semibold text-navy-950 border border-crimson-200 shadow-2xs hover:bg-crimson-100 hover:text-crimson-950 transition-colors"
                >
                  ⚡ {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Quick Filters Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="font-bold text-sm text-navy-950 flex items-center space-x-2">
                  <Search className="h-4 w-4 text-crimson-700" />
                  <span>Quick Criteria</span>
                </span>
                <button
                  onClick={() => setAdvancedModalOpen(true)}
                  className="text-xs text-crimson-700 font-bold hover:underline"
                >
                  More Filters +
                </button>
              </div>

              <div className="space-y-4">
                {/* Gender / Looking For */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Looking For</label>
                  {user?.gender ? (
                    <div className="rounded-lg bg-crimson-50 border border-crimson-200 px-3 py-2 text-xs font-bold text-crimson-900 flex items-center justify-between">
                      <span>{user.gender === 'FEMALE' ? 'Groom (বর) Profiles' : 'Bride (কনে) Profiles'}</span>
                      <span className="text-[10px] bg-crimson-200/70 text-crimson-900 px-2 py-0.5 rounded font-semibold">Matched to you</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLookingFor('FEMALE')}
                        className={`py-2 text-xs font-bold rounded-lg ${
                          lookingFor === 'FEMALE'
                            ? 'bg-navy-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Bride (কনে)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLookingFor('MALE')}
                        className={`py-2 text-xs font-bold rounded-lg ${
                          lookingFor === 'MALE'
                            ? 'bg-navy-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Groom (বর)
                      </button>
                    </div>
                  )}
                </div>

                {/* Community */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Community</label>
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                  >
                    <option value="ALL">{communities.length > 0 ? 'All Communities' : 'Loading...'}</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                  >
                    <option value="ALL">{states.length > 0 ? 'All Locations' : 'Loading...'}</option>
                    {states.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Diet Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                    <Utensils className="h-3 w-3 text-crimson-700" />
                    <span>Diet Preference</span>
                  </label>
                  <select
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                  >
                    <option value="ALL">{dietOptions.length > 0 ? 'Does not matter' : 'Loading...'}</option>
                    {dietOptions.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Marital Status</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                  >
                    <option value="ALL">{maritalStatuses.length > 0 ? 'Does not matter' : 'Loading...'}</option>
                    {maritalStatuses.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Verification Toggle */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="rounded border-slate-300 text-crimson-700 focus:ring-crimson-600 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-crimson-700" />
                      <span>Mobile Verified Profiles Only</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Results List */}
          <main className="lg:col-span-8 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-crimson-700 mb-3" />
                <p className="text-sm font-medium">Searching verified profiles in Supabase...</p>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <>
                <div className="space-y-4">
                  {filteredProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      layout="horizontal"
                      onExpressInterest={() => handleInterest(profile.id, profile.name)}
                      onToggleShortlist={() => handleToggleShortlist(profile.id, profile.name, profile.isShortlisted)}
                      onMessage={() => handleStartMessage(profile.id)}
                      onBlock={() => handleBlock(profile.id, profile.name)}
                      onReport={() => setReportModalData({ id: profile.id, name: profile.name })}
                    />
                  ))}
                </div>

                {totalCount > pageSize && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 bg-white p-4 rounded-2xl shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} profiles
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 text-xs font-bold text-navy-950 bg-slate-100 rounded-xl">
                        Page {currentPage} of {Math.max(1, Math.ceil(totalCount / pageSize))}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl bg-white p-12 text-center border border-slate-200">
                <Search className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No profiles found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your age or location filters to see more members from the community.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <RegisterModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => {}} />
      <AdvancedSearchModal
        isOpen={advancedModalOpen}
        onClose={() => setAdvancedModalOpen(false)}
        onApplyFilters={handleApplyAdvancedFilters}
        onSaveSearch={handleSaveSearch}
      />
      <UpgradeToPrimeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />
      {reportModalData && (
        <ReportProfileModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          profileId={reportModalData.id}
          profileName={reportModalData.name}
        />
      )}
    </div>
  )
}
