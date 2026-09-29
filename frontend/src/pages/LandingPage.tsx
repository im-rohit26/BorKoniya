import React, { useState } from 'react'
import { Header } from '../components/common/Header'
import { Hero } from '../components/home/Hero'
import { SearchPreview } from '../components/home/SearchPreview'
import { SafetyBanner } from '../components/common/SafetyBanner'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { ProfileCard } from '../components/cards/ProfileCard'
import { DEMO_PROFILES } from '../data/mockProfiles'
import { Sparkles, ShieldCheck, Users, ArrowRight, Award } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [profiles, setProfiles] = useState(DEMO_PROFILES)

  const handleRegistrationSuccess = () => {
    setRegisterModalOpen(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <SafetyBanner />

      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => setRegisterModalOpen(true)}
      />

      <Hero
        onStartRegistration={() => setRegisterModalOpen(true)}
        onStartSearch={() => navigate('/search')}
      />

      <SearchPreview />

      <section className="py-16 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Recommended Community Profiles</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 font-serif">
              Discover Meaningful Alliances
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Curated profiles verified through mobile OTP and community background screening.
            </p>
          </div>

          <Link
            to="/search"
            className="inline-flex items-center space-x-2 text-sm font-bold text-amber-700 hover:text-amber-800 transition-colors"
          >
            <span>Browse All Profiles</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.slice(0, 4).map((profile) => (
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
              onMessage={() => navigate(`/messages`)}
            />
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-amber-50/40 py-16 sm:py-20 border-y border-amber-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif">
              Built Specifically for the Sadgope & Gowala Community
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Unlike generic matrimonial portals, BorKonya is tailored to honor the specific cultural nuances, native roots, gotras, and family values of our people.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 mb-5 border border-amber-200">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                Community Authenticity
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Clear distinction of sub-communities (Kulin, Ghosh, Pal, Sarkar, Ahir, Gope), native districts across West Bengal, Odisha, Jharkhand, and family lineage.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-5 border border-emerald-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                Strict Privacy Controls
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Contact numbers and personal photos are protected by default. Only verified and permitted members can view private family contact information.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 mb-5 border border-indigo-200">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                Fair & Affordable Access
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                No exorbitant ₹5,000+ packages. Premium access is only ₹200/month, with 50% discount coupons for eligible community families.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Community Success Story
            </span>
            <h3 className="text-3xl font-extrabold font-serif">
              “We found mutual respect and traditional harmony on BorKonya.”
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              — Debabrata & Poulomi (Married Feb 2025, Bardhaman & Medinipur). Dedicated matchmaking that brought two cultured Sadgope families together.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all active:scale-95"
              >
                <span>Begin Your Journey Today</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <LanguageSelectorModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  )
}
