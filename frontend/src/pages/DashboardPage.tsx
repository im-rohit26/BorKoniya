import React, { useState, useEffect } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { ProfileCard } from '../components/cards/ProfileCard'
import { DEMO_PROFILES } from '../data/mockProfiles'
import {
  Sparkles,
  Heart,
  Star,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getInterestsSummary, getShortlist } from '../lib/interactionApi'
import { useAuth } from '../context/AuthContext'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [interestsSummary, setInterestsSummary] = useState({
    received_pending: 1,
    sent_pending: 1,
    total_active_connections: 1,
  })
  const [shortlistCount, setShortlistCount] = useState(1)

  useEffect(() => {
    getInterestsSummary()
      .then((s) => setInterestsSummary(s))
      .catch((err) => console.log('Summary error:', err))

    getShortlist()
      .then((list) => setShortlistCount(list.length))
      .catch((err) => console.log('Shortlist error:', err))
  }, [])

  const completionPct = 85
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Valued Member'
  const communityDisplay = user?.community ? `${user.community} Community` : 'Sadgope / Gowala Community'
  const profileIdDisplay = `BK-${(user?.profile_id || user?.user_id || '7492').slice(0, 6).toUpperCase()}`

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />

      <div className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner & Profile Completion Meter */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-semibold text-amber-400">Welcome Back 👋</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif">
                {displayName}
              </h1>
              <p className="text-xs text-slate-300">
                {communityDisplay} • Profile ID: {profileIdDisplay}
              </p>
            </div>

            {/* Completion Meter */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 sm:p-5 border border-white/10 w-full md:w-80">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span>Profile Completion</span>
                <span className="text-amber-400">{completionPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Add Family Horoscope (+15%)</span>
                <Link to="/profile/edit" className="text-amber-400 font-semibold underline">
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
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-amber-50/50 hover:border-amber-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Recommended</span>
              <Sparkles className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900">{DEMO_PROFILES.length}</div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">Explore Matches &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/interests')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-rose-50/50 hover:border-rose-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Interests</span>
              <Heart className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {interestsSummary.received_pending + interestsSummary.sent_pending}
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-1">Manage Requests &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/shortlist')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-amber-50/50 hover:border-amber-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Shortlisted</span>
              <Star className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900">{shortlistCount}</div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">View Saved Profiles &rarr;</p>
          </div>

          <div
            onClick={() => navigate('/messages')}
            className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Messages</span>
              <MessageSquare className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900">{interestsSummary.total_active_connections}</div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">Open Chat &rarr;</p>
          </div>
        </div>

        {/* Top Matches Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-serif">
              Top Recommended Matches for You
            </h2>
            <Link
              to="/matches"
              className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              <span>View All Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DEMO_PROFILES.slice(0, 2).map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onMessage={() => navigate('/messages')}
              />
            ))}
          </div>

        </div>
      </div>

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  )
}


