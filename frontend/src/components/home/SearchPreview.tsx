import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, MapPin, GraduationCap, Briefcase, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const SearchPreview: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lockedGender = user?.gender === 'FEMALE' ? 'MALE' : (user?.gender === 'MALE' ? 'FEMALE' : undefined)

  const [lookingFor, setLookingFor] = useState<'FEMALE' | 'MALE'>(lockedGender || 'FEMALE')
  const [ageFrom, setAgeFrom] = useState('21')
  const [ageTo, setAgeTo] = useState('28')

  useEffect(() => {
    if (lockedGender) {
      setLookingFor(lockedGender)
    }
  }, [lockedGender])
  const [state, setState] = useState('West Bengal')
  const [city, setCity] = useState('')
  const [education, setEducation] = useState('Any')
  const [profession, setProfession] = useState('Any')

  const states = [
    'West Bengal',
    'Odisha',
    'Jharkhand',
    'Bihar',
    'Chhattisgarh',
    'Maharashtra',
    'Gujarat',
    'Delhi/NCR',
    'All India',
  ]

  const educations = [
    'Any',
    'B.E / B.Tech / M.Tech',
    'MBA / PGDM',
    'Doctor / MBBS / MD',
    'Chartered Accountant (CA)',
    'Master’s Degree (MA/M.Sc/M.Com)',
    'Bachelor’s Degree (BA/B.Sc/B.Com)',
    'Civil Services / Government',
  ]

  const professions = [
    'Any',
    'Software / IT Professional',
    'Civil Servant / Govt Officer',
    'Teacher / Professor',
    'Doctor / Healthcare Professional',
    'Banking / Financial Expert',
    'Business / Entrepreneur',
    'Engineer',
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const queryParams = new URLSearchParams({
      gender: lockedGender || lookingFor,
      ageFrom,
      ageTo,
      state,
      city,
      education,
      profession,
    })
    navigate(`/search?${queryParams.toString()}`)
  }

  return (
    <div className="relative -mt-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 z-20">
      <div className="rounded-3xl bg-white p-5 sm:p-8 shadow-xl border border-slate-200/90 ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-lg bg-crimson-50 flex items-center justify-center text-crimson-700">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-950 font-serif">
                {t('searchPreview.title', 'Find Your Community Match')}
              </h2>
              <p className="text-xs text-slate-500">
                Filter verified Sadgope, Gowala & Goala profiles
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-crimson-800 bg-crimson-50 px-3 py-1 rounded-full border border-crimson-200">
            Smart Community Search
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Looking For */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.lookingFor', 'Looking for')}
              </label>
              {lockedGender ? (
                <div className="py-2.5 px-3 text-xs font-bold rounded-xl bg-crimson-50 text-crimson-900 border border-crimson-200 flex items-center justify-between">
                  <span>{lockedGender === 'MALE' ? t('searchPreview.groom', 'Groom (বর)') : t('searchPreview.bride', 'Bride (কনে)')}</span>
                  <span className="text-[10px] bg-crimson-200/70 text-crimson-900 px-2 py-0.5 rounded font-semibold">Matched to you</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLookingFor('FEMALE')}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                      lookingFor === 'FEMALE'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('searchPreview.bride', 'Bride (কনে)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookingFor('MALE')}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                      lookingFor === 'MALE'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('searchPreview.groom', 'Groom (বর)')}
                  </button>
                </div>
              )}
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.age', 'Age Range (Years)')}
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={ageFrom}
                  onChange={(e) => setAgeFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
                >
                  {Array.from({ length: 25 }, (_, i) => i + 18).map((num) => (
                    <option key={num} value={num}>
                      {num} Yrs
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 font-semibold">to</span>
                <select
                  value={ageTo}
                  onChange={(e) => setAgeTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 21).map((num) => (
                    <option key={num} value={num}>
                      {num} Yrs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.state', 'Location / State')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.city', 'City (Optional)')}
              </label>
              <input
                type="text"
                placeholder="e.g. Kolkata, Bhubaneswar"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Secondary Row: Profession & Search Button */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-1">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.education', 'Education Level')}
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
                >
                  {educations.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('searchPreview.profession', 'Occupation Category')}
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-600 focus:bg-white focus:outline-none"
                >
                  {professions.map((prof) => (
                    <option key={prof} value={prof}>
                      {prof}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
              >
                <Search className="h-4 w-4" />
                <span>{t('searchPreview.btnSearch', 'Search Profiles')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
