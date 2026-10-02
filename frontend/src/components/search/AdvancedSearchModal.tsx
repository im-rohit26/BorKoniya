import React, { useState, useEffect } from 'react'
import { X, SlidersHorizontal, Bookmark, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: any) => void
  onSaveSearch: (name: string, filters: any) => void
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  onSaveSearch,
}) => {
  const { user } = useAuth()
  const lockedGender = user?.gender === 'FEMALE' ? 'MALE' : (user?.gender === 'MALE' ? 'FEMALE' : undefined)

  const [filters, setFilters] = useState({
    lookingFor: lockedGender || 'FEMALE',
    community: 'ALL',
    subCommunity: 'ALL',
    state: 'ALL',
    nativePlace: '',
    ageMin: 21,
    ageMax: 32,
    heightMinCm: 152,
    heightMaxCm: 185,
    maritalStatus: 'NEVER_MARRIED',
    education: 'ANY',
    profession: 'ANY',
    incomeMin: 'ANY',
    diet: 'ALL',
    verifiedOnly: true,
    photoOnly: true,
  })

  useEffect(() => {
    if (lockedGender) {
      setFilters((prev) => ({ ...prev, lookingFor: lockedGender }))
    }
  }, [lockedGender])

  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    onApplyFilters({
      ...filters,
      lookingFor: lockedGender || filters.lookingFor,
    })
    onClose()
  }

  const handleSaveSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!saveSearchName.trim()) return
    onSaveSearch(saveSearchName, filters)
    setIsSavedSuccess(true)
    setTimeout(() => {
      setIsSavedSuccess(false)
      setShowSaveInput(false)
      setSaveSearchName('')
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-8 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 mb-6">
          <div className="h-10 w-10 rounded-xl bg-crimson-50 flex items-center justify-center text-crimson-700 border border-crimson-200">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-950 font-serif">
              Advanced Matrimonial Criteria Filter
            </h2>
            <p className="text-xs text-slate-500">
              Granular filtering tailored to Sadgope & Gowala matrimonial traditions
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-6">
          {/* Section 1: Looking For & Age / Height */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <span>Personal & Age Criteria</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Looking For</label>
                {lockedGender ? (
                  <div className="w-full rounded-xl border border-crimson-200 bg-crimson-50 px-3 py-2 text-xs font-bold text-crimson-900">
                    {lockedGender === 'MALE' ? 'Groom (বর)' : 'Bride (কনে)'}
                  </div>
                ) : (
                  <select
                    value={filters.lookingFor}
                    onChange={(e) => setFilters({ ...filters, lookingFor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                  >
                    <option value="FEMALE">Bride (কনে)</option>
                    <option value="MALE">Groom (বর)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age Range ({filters.ageMin} – {filters.ageMax} yrs)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="18"
                    max="60"
                    value={filters.ageMin}
                    onChange={(e) => setFilters({ ...filters, ageMin: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-center font-bold focus:border-crimson-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="number"
                    min="20"
                    max="65"
                    value={filters.ageMax}
                    onChange={(e) => setFilters({ ...filters, ageMax: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-center font-bold focus:border-crimson-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marital Status
                </label>
                <select
                  value={filters.maritalStatus}
                  onChange={(e) => setFilters({ ...filters, maritalStatus: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="NEVER_MARRIED">Never Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="AWAITING_DIVORCE">Awaiting Divorce</option>
                  <option value="ALL">Any Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Community & Native Origin */}
          <div className="rounded-2xl bg-crimson-50/40 p-4 border border-crimson-200/70 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-crimson-900 flex items-center space-x-1.5">
              <span>Community & Native Origin</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Community</label>
                <select
                  value={filters.community}
                  onChange={(e) => setFilters({ ...filters, community: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="ALL">All Communities</option>
                  <option value="Sadgope">Sadgope</option>
                  <option value="Gowala">Gowala / Goala</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-Community
                </label>
                <select
                  value={filters.subCommunity}
                  onChange={(e) => setFilters({ ...filters, subCommunity: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="ALL">All Sub-communities</option>
                  <option value="Kulin Sadgope">Kulin Sadgope</option>
                  <option value="Ghosh">Ghosh</option>
                  <option value="Pal">Pal</option>
                  <option value="Sarkar">Sarkar</option>
                  <option value="Mollik">Mollik</option>
                  <option value="Ahir">Ahir</option>
                  <option value="Gope">Gope</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Native Place Belt
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bardhaman, Medinipur"
                  value={filters.nativePlace}
                  onChange={(e) => setFilters({ ...filters, nativePlace: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-crimson-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Education & Career */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <span>Education & Profession</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Education Level
                </label>
                <select
                  value={filters.education}
                  onChange={(e) => setFilters({ ...filters, education: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="ANY">Any Education</option>
                  <option value="Tech">B.Tech / M.Tech / Engineering</option>
                  <option value="MBA">MBA / Management</option>
                  <option value="Doctor">MBBS / Doctor / MD</option>
                  <option value="CA">Chartered Accountant (CA)</option>
                  <option value="Master">Master’s Degree</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profession Category
                </label>
                <select
                  value={filters.profession}
                  onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="ANY">Any Profession</option>
                  <option value="Software">Software / IT</option>
                  <option value="Govt">Government / Civil Services</option>
                  <option value="Banking">Banking & Finance</option>
                  <option value="Doctor">Medical Professional</option>
                  <option value="Business">Business / Entrepreneur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diet Preference
                </label>
                <select
                  value={filters.diet}
                  onChange={(e) => setFilters({ ...filters, diet: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:outline-none"
                >
                  <option value="ALL">Any Diet</option>
                  <option value="NON_VEG">Non-Vegetarian</option>
                  <option value="VEG">Vegetarian</option>
                  <option value="JAIN">Jain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Quality & Trust Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-semibold text-slate-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-crimson-700 focus:ring-crimson-600"
              />
              <span className="flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-crimson-700" />
                <span>Mobile Verified Only</span>
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.photoOnly}
                onChange={(e) => setFilters({ ...filters, photoOnly: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-crimson-700 focus:ring-crimson-600"
              />
              <span>Profiles With Photos Only</span>
            </label>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              {!showSaveInput ? (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900"
                >
                  <Bookmark className="h-4 w-4 text-crimson-700" />
                  <span>Save this search query</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Search name (e.g. Kolkata Sadgope)"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-crimson-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSearchSubmit}
                    className="rounded-xl bg-crimson-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-crimson-800"
                  >
                    Save
                  </button>
                  {isSavedSuccess && (
                    <span className="text-xs text-crimson-700 font-bold flex items-center space-x-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 px-6 py-2.5 text-xs font-bold text-white shadow-md"
              >
                <Sparkles className="h-4 w-4 text-crimson-100" />
                <span>Apply Advanced Filters</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
