import React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Sparkles, Users, Search, CheckCircle2, HeartHandshake } from 'lucide-react'

interface HeroProps {
  onStartRegistration: () => void
  onStartSearch: () => void
}

export const Hero: React.FC<HeroProps> = ({ onStartRegistration, onStartSearch }) => {
  const { t } = useTranslation()

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/40 via-white to-slate-50/60 pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 rounded-full bg-amber-100/80 px-4 py-1.5 text-xs font-semibold text-amber-900 border border-amber-200/60 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>{t('hero.trustedBadge', 'Dedicated Sadgope & Gowala Matrimony')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 font-serif leading-[1.15]">
              Find Your Life Partner Within Your{' '}
              <span className="relative whitespace-nowrap text-amber-600">
                <span className="relative z-10">Community</span>
                <span className="absolute bottom-2 left-0 -z-10 h-3 w-full bg-amber-200/70 rounded-xs" />
              </span>
            </h1>

            <p className="mx-auto lg:mx-0 max-w-2xl text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              {t(
                'hero.subtitle',
                'Meaningful connections for Sadgope, Gowala & Goala families. Preserving sacred values, honoring traditions, and embracing modern aspirations.'
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartRegistration}
                className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:from-slate-800 hover:to-indigo-900 transition-all active:scale-98"
              >
                <HeartHandshake className="h-5 w-5 text-amber-400" />
                <span>{t('hero.ctaRegister', 'Create Your Profile')}</span>
              </button>

              <button
                onClick={onStartSearch}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border-2 border-slate-300/80 bg-white/80 px-7 py-3.5 text-base font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                <Search className="h-5 w-5 text-amber-600" />
                <span>{t('hero.ctaSearch', 'Find Your Match')}</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-200/70 text-left max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>100% Verified Profiles</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Contact Privacy Control</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Family Centric Matchmaking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Matrimonial Card Presentation */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-amber-100/90 ring-1 ring-slate-900/5">
              {/* Profile Card Mockup */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-100 via-rose-50 to-indigo-50 p-6 text-center">
                <div className="mx-auto mb-4 h-28 w-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-md">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-slate-900 font-serif text-3xl font-bold">
                    BK
                  </div>
                </div>

                <div className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mobile & Email Verified</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">Priyanka Ghosh, 26</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  M.Tech (Software Engineer) • Kolkata / Bardhaman
                </p>
                <p className="text-xs text-amber-800 font-semibold mt-0.5">
                  Sadgope Community (Kulin)
                </p>

                <div className="mt-4 rounded-xl bg-white/90 p-3 shadow-xs border border-amber-100/80 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Compatibility Index</span>
                    <span className="text-amber-600 font-extrabold text-sm">94% Match</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 w-[94%]" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    ✓ Community & Sub-caste aligned • ✓ Education matches • ✓ Native region matches
                  </p>
                </div>
              </div>

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
