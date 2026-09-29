import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { ProfileCard } from '../components/cards/ProfileCard'
import { AdvancedSearchModal } from '../components/search/AdvancedSearchModal'
import { DEMO_PROFILES } from '../data/mockProfiles'
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  ShieldCheck,
  Utensils,
  Bookmark,
  ArrowUpDown,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { startOrGetConversation, blockProfile } from '../lib/interactionApi'
import { ReportProfileModal } from '../components/safety/ReportProfileModal'

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false)
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null)

  // Filters State
  const [lookingFor, setLookingFor] = useState(searchParams.get('gender') || 'FEMALE')
  const [community, setCommunity] = useState('ALL')
  const [state, setState] = useState(searchParams.get('state') || 'ALL')
  const [education, setEducation] = useState(searchParams.get('education') || 'ALL')
  const [profession, setProfession] = useState(searchParams.get('profession') || 'ALL')
  const [maritalStatus, setMaritalStatus] = useState('ALL')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [diet, setDiet] = useState('ALL')
  const [sortBy, setSortBy] = useState<'score' | 'age_asc' | 'age_desc'>('score')

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState([
    {
      id: 'saved-1',
      name: 'Kolkata Sadgope Brides',
      filters: { lookingFor: 'FEMALE', community: 'Sadgope', state: 'West Bengal' },
    },
    {
      id: 'saved-2',
      name: 'Software Engineers (Sadgope / Gowala)',
      filters: { education: 'Tech', profession: 'Software' },
    },
  ])

  const [profiles, setProfiles] = useState(DEMO_PROFILES)
  const [filteredProfiles, setFilteredProfiles] = useState(DEMO_PROFILES)

  useEffect(() => {
    let result = [...profiles]

    if (community !== 'ALL') {
      result = result.filter((p) => p.community.toLowerCase().includes(community.toLowerCase()))
    }
    if (state !== 'ALL' && state !== 'All India') {
      result = result.filter((p) => p.location.toLowerCase().includes(state.toLowerCase()))
    }
    if (verifiedOnly) {
      result = result.filter((p) => p.isMobileVerified)
    }

    // Sort
    if (sortBy === 'age_asc') {
      result.sort((a, b) => a.age - b.age)
    } else if (sortBy === 'age_desc') {
      result.sort((a, b) => b.age - a.age)
    } else {
      result.sort((a, b) => b.matchScore - a.matchScore)
    }

    setFilteredProfiles(result)
  }, [community, state, education, profession, verifiedOnly, diet, sortBy, profiles])

  const handleResetFilters = () => {
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
    setLookingFor(adv.lookingFor)
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
    if (saved.filters.lookingFor) setLookingFor(saved.filters.lookingFor)
    if (saved.filters.community) setCommunity(saved.filters.community)
    if (saved.filters.state) setState(saved.filters.state)
    if (saved.filters.maritalStatus) setMaritalStatus(saved.filters.maritalStatus)
    if (saved.filters.education) setEducation(saved.filters.education)
    if (saved.filters.profession) setProfession(saved.filters.profession)
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
      alert(err.message || 'Chat unlocks when mutual interest is accepted.')
    }
  }

  const handleBlock = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to block ${name}?`)) return
    try {
      await blockProfile(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      alert(`${name} has been blocked.`)
    } catch (err: any) {
      alert(err.message || 'Failed to block member')
    }
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
              Matrimonial Search Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Showing {filteredProfiles.length} verified matrimonial profiles for the Sadgope & Gowala community
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Advanced Search Trigger */}
            <button
              onClick={() => setAdvancedModalOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
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
          <div className="mb-6 rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-950 font-bold">
              <Bookmark className="h-4 w-4 text-amber-700" />
              <span>Saved Search Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedSearches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSavedSearch(s)}
                  className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-800 border border-amber-200 shadow-2xs hover:bg-amber-100 hover:text-amber-950 transition-colors"
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
                <span className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Search className="h-4 w-4 text-amber-600" />
                  <span>Quick Criteria</span>
                </span>
                <button
                  onClick={() => setAdvancedModalOpen(true)}
                  className="text-xs text-amber-700 font-bold hover:underline"
                >
                  More Filters +
                </button>
              </div>

              <div className="space-y-4">
                {/* Gender / Looking For */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Looking For</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLookingFor('FEMALE')}
                      className={`py-2 text-xs font-bold rounded-lg ${
                        lookingFor === 'FEMALE'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Bride (কনে)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLookingFor('MALE')}
                      className={`py-2 text-xs font-bold rounded-lg ${
                        lookingFor === 'MALE'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Groom (বর)
                    </button>
                  </div>
                </div>

                {/* Community */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Community</label>
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ALL">All Communities</option>
                    <option value="Sadgope">Sadgope</option>
                    <option value="Gowala">Gowala / Goala</option>
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ALL">All Locations</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi / NCR</option>
                  </select>
                </div>

                {/* Diet Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                    <Utensils className="h-3 w-3 text-amber-600" />
                    <span>Diet Preference</span>
                  </label>
                  <select
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ALL">Does not matter</option>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Marital Status</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ALL">Does not matter</option>
                    <option value="NEVER_MARRIED">Never Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>

                {/* Verification Toggle */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Mobile Verified Profiles Only</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Results List */}
          <main className="lg:col-span-8 space-y-4">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onExpressInterest={(id) => {
                    setProfiles((prev) =>
                      prev.map((p) => (p.id === id ? { ...p, isInterestSent: true } : p))
                    )
                  }}
                  onToggleShortlist={(id) => {
                    setProfiles((prev) =>
                      prev.map((p) => (p.id === id ? { ...p, isShortlisted: !p.isShortlisted } : p))
                    )
                  }}
                  onMessage={() => handleStartMessage(profile.id)}
                  onBlock={() => handleBlock(profile.id, profile.name)}
                  onReport={() => setReportModalData({ id: profile.id, name: profile.name })}
                />
              ))
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

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <RegisterModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => {}} />
      <AdvancedSearchModal
        isOpen={advancedModalOpen}
        onClose={() => setAdvancedModalOpen(false)}
        onApplyFilters={handleApplyAdvancedFilters}
        onSaveSearch={handleSaveSearch}
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
