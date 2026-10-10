import React, { useState, useEffect, useMemo } from 'react'
import { Header } from '../components/common/Header'
import { Hero } from '../components/home/Hero'
import { SearchPreview } from '../components/home/SearchPreview'
import { SafetyBanner } from '../components/common/SafetyBanner'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { ProfileCard, type ProfileCardData } from '../components/cards/ProfileCard'
import { Sparkles, ShieldCheck, Users, ArrowRight, Award, CheckCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  sendInterest,
  addToShortlist,
  removeFromShortlist,
} from '../lib/interactionApi'
import {
  getRecommendedMatches,
  mapProfileResponseToCard,
  getMyProfile,
  type ProfileResponse,
} from '../lib/profileApi'
import { UpgradeToPrimeModal } from '../components/common/UpgradeToPrimeModal'
import { useAuth } from '../context/AuthContext'
import { useInteractionStatus, useUserSubscription } from '../hooks/useSharedData'
import { invalidateInteractionCache } from '../lib/queryClient'
import { ProfileCardSkeleton } from '../components/skeletons'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [myProfile, setMyProfile] = useState<ProfileResponse | null>(null)
  const [rawProfiles, setRawProfiles] = useState<ProfileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Central cached user subscription and interaction sets
  const { isPremium: isPremiumUser } = useUserSubscription()
  const { shortlistedSet, sentInterestSet, connectedSet } = useInteractionStatus()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    if (isAuthenticated) {
      getMyProfile()
        .then((p) => setMyProfile(p))
        .catch(() => setMyProfile(null))
    } else {
      setMyProfile(null)
    }
  }, [isAuthenticated, user?.user_id])

  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    const fetchProfiles = async () => {
      try {
        const raw = await getRecommendedMatches(6)
        if (!isCancelled) {
          setRawProfiles(raw || [])
        }
      } catch (err) {
        console.error('Failed to load landing profiles:', err)
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
  }, [isAuthenticated, user?.user_id])

  const profiles: ProfileCardData[] = useMemo(() => {
    return rawProfiles.map((p) =>
      mapProfileResponseToCard(
        p,
        shortlistedSet.has(p.id),
        sentInterestSet.has(p.id),
        connectedSet.has(p.id)
      )
    )
  }, [rawProfiles, shortlistedSet, sentInterestSet, connectedSet])

  const handleInterest = async (id: string, name: string) => {
    if (!isAuthenticated) {
      setRegisterModalOpen(true)
      throw new Error('Please login or register to express interest')
    }
    try {
      await sendInterest(id)
      invalidateInteractionCache()
      window.dispatchEvent(new CustomEvent('borkonya:interests-updated'))
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
        showToast(`${name} removed from shortlist.`)
      } else {
        await addToShortlist(id)
        showToast(`${name} added to shortlist!`)
      }
      invalidateInteractionCache()
      window.dispatchEvent(new CustomEvent('borkonya:interests-updated'))
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }

  const handleStartMessage = (_profileId?: string) => {
    if (!isPremiumUser) {
      setUpgradeModalOpen(true)
      return
    }
    navigate('/messages')
  }

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
        user={user}
        myProfile={myProfile}
        isAuthenticated={isAuthenticated}
        onNavigateDashboard={() => navigate('/dashboard')}
        onNavigateProfileWizard={() => navigate('/profile/wizard')}
      />

      <SearchPreview />

      <section className="py-16 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 rounded-md bg-crimson-50 px-2.5 py-1 text-xs font-bold text-crimson-800 border border-crimson-200 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-crimson-700" />
              <span>
                {isAuthenticated && (myProfile || user)
                  ? 'Curated Community Matches'
                  : 'Recommended Community Profiles'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-serif">
              {isAuthenticated && (myProfile?.first_name || user?.first_name)
                ? `Matches Tailored For ${myProfile?.first_name || user?.first_name}`
                : 'Discover Meaningful Alliances'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isAuthenticated
                ? 'Verified community members aligned with your profile and partner preferences.'
                : 'Curated profiles verified through mobile OTP and community background screening.'}
            </p>
          </div>

          <Link
            to="/search"
            className="inline-flex items-center space-x-2 text-sm font-bold text-crimson-700 hover:text-crimson-800 transition-colors flex-shrink-0"
          >
            <span>Browse All Profiles</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <ProfileCardSkeleton key={`landing-skeleton-${idx}`} layout="vertical" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.slice(0, 3).map((profile) => (
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
      </section>

      <section className="bg-gradient-to-b from-white to-slate-50/60 py-16 sm:py-20 border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-950 font-serif">
              Built Specifically for the Sadgope & Gowala Community
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Unlike generic matrimonial portals, BorKonya is tailored to honor the specific cultural nuances, native roots, gotras, and family values of our people.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-crimson-50 flex items-center justify-center text-crimson-700 mb-5 border border-crimson-200">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-navy-950 font-serif">
                Community Authenticity
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Clear distinction of sub-communities (Kulin, Ghosh, Pal, Sarkar, Ahir, Gope), native districts across West Bengal, Odisha, Jharkhand, and family lineage.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-navy-50 flex items-center justify-center text-navy-800 mb-5 border border-navy-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-navy-950 font-serif">
                Strict Privacy Controls
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Contact numbers and personal photos are protected by default. Only verified and permitted members can view private family contact information.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-crimson-50 flex items-center justify-center text-crimson-700 mb-5 border border-crimson-200">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-navy-950 font-serif">
                Fair & Affordable Access
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                No exorbitant ₹5,000+ packages. Premium access is only ₹200/month, with 50% discount coupons for eligible community families.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-crimson-300">
              Community Success Story
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-serif">
              “We found mutual respect and traditional harmony on BorKonya.”
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              — Debabrata & Poulomi (Married Feb 2025, Bardhaman & Medinipur). Dedicated matchmaking that brought two cultured Sadgope families together.
            </p>
            <div className="pt-2">
              <button
                onClick={() => (isAuthenticated ? navigate('/dashboard') : setRegisterModalOpen(true))}
                className="inline-flex items-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 px-6 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95"
              >
                <span>{isAuthenticated ? 'Go to Your Dashboard' : 'Begin Your Journey Today'}</span>
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

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 border border-crimson-400/40">
          <CheckCircle className="w-5 h-5 text-crimson-400 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <UpgradeToPrimeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName="Direct Family Messaging"
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  )
}
