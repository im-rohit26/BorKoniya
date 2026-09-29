import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Star,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  EyeOff,
  Slash,
  Flag,
  Check,
} from 'lucide-react'
import { MatchScoreBadge } from './MatchScoreBadge'
import { ProtectedPhoto } from '../security/ProtectedPhoto'

export interface ProfileCardData {
  id: string
  name: string
  age: number
  height: string
  location: string
  nativePlace?: string
  education: string
  profession: string
  company?: string
  community: string
  subCommunity?: string
  photoUrl: string
  matchScore: number
  matchBreakdown?: string[]
  isMobileVerified: boolean
  isEmailVerified: boolean
  shortBio: string
  isShortlisted?: boolean
  isInterestSent?: boolean
}

interface ProfileCardProps {
  profile: ProfileCardData
  onExpressInterest?: (id: string) => void
  onToggleShortlist?: (id: string) => void
  onMessage?: (id: string) => void
  onBlock?: (id: string) => void
  onReport?: (id: string) => void
  onHide?: (id: string) => void
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onExpressInterest,
  onToggleShortlist,
  onMessage,
  onBlock,
  onReport,
  onHide,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [interestSent, setInterestSent] = useState(profile.isInterestSent || false)
  const [isShortlisted, setIsShortlisted] = useState(profile.isShortlisted || false)

  const handleInterest = () => {
    setInterestSent(!interestSent)
    if (onExpressInterest) onExpressInterest(profile.id)
  }

  const handleShortlist = () => {
    setIsShortlisted(!isShortlisted)
    if (onToggleShortlist) onToggleShortlist(profile.id)
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col sm:flex-row">
        {/* Protected Photo Container */}
        <div className="relative h-64 sm:h-auto sm:w-56 flex-shrink-0 bg-slate-100 overflow-hidden">
          <ProtectedPhoto
            src={profile.photoUrl}
            alt={profile.name}
            profileId={profile.id}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden pointer-events-none" />

          {/* Mobile Name Overlay */}
          <div className="absolute bottom-3 left-3 right-3 text-white sm:hidden">
            <h3 className="text-lg font-bold">
              {profile.name}, {profile.age}
            </h3>
            <p className="text-xs text-amber-300 font-medium">{profile.community}</p>
          </div>

          {/* Verification Badge on Photo */}
          {(profile.isMobileVerified || profile.isEmailVerified) && (
            <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-slate-700">
              <ShieldCheck className="h-3 w-3" />
              <span>Verified</span>
            </div>
          )}
        </div>

        {/* Profile Info Details */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            {/* Header: Name, Match Score, More Menu */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="hidden sm:inline-block text-xl font-bold text-slate-900 font-serif">
                    {profile.name}, {profile.age}
                  </h3>
                  <span className="hidden sm:inline-block text-xs text-slate-500">
                    ({profile.height})
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                    {profile.community}
                    {profile.subCommunity ? ` (${profile.subCommunity})` : ''}
                  </span>
                  {profile.nativePlace && (
                    <span className="text-xs text-slate-500">Native: {profile.nativePlace}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <MatchScoreBadge
                  score={profile.matchScore}
                  breakdown={profile.matchBreakdown}
                />

                {/* More options menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-xl bg-white p-1 text-xs shadow-xl border border-slate-100">
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          if (onHide) onHide(profile.id)
                        }}
                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-50"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          if (onBlock) onBlock(profile.id)
                        }}
                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-50"
                      >
                        <Slash className="h-3.5 w-3.5" />
                        <span>Block User</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          if (onReport) onReport(profile.id)
                        }}
                        className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>Report Profile</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <MapPin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">{profile.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">{profile.education}</span>
              </div>
              <div className="flex items-center space-x-2 sm:col-span-2">
                <Briefcase className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">
                  {profile.profession}
                  {profile.company ? ` at ${profile.company}` : ''}
                </span>
              </div>
            </div>

            {/* Short Bio */}
            <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {profile.shortBio}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {/* Express Interest */}
              <button
                onClick={handleInterest}
                className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  interestSent
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                }`}
              >
                {interestSent ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Interest Sent</span>
                  </>
                ) : (
                  <>
                    <Heart className="h-3.5 w-3.5" />
                    <span>Express Interest</span>
                  </>
                )}
              </button>

              {/* Shortlist */}
              <button
                onClick={handleShortlist}
                className={`flex items-center space-x-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  isShortlisted
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="Save to Shortlist"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isShortlisted ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                </span>
              </button>

              {/* Message */}
              <button
                onClick={() => onMessage && onMessage(profile.id)}
                className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                title="Send direct message"
              >
                <MessageCircle className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Message</span>
              </button>
            </div>

            <Link
              to={`/profile/${profile.id}`}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-4"
            >
              View Full Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
