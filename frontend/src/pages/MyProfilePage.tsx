import React, { useState, useEffect, useRef } from 'react'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import {
  User,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  MapPin,
  Home,
  Phone,
  Mail,
  Heart,
  Utensils,
  Gem,
  MessageSquare,
  Ruler,
  CheckCircle2,
  Pencil,
  Copy,
  Check,
  MoveVertical,
  Search,
  Loader2,
  X,
  AlertCircle,
  Lock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getMyProfile,
  formatHeight,
  uploadProfilePhoto,
  type ProfileResponse,
} from '../lib/profileApi'
import { updateMyProfile } from '../lib/authApi'
import { masterDataApi, type Community } from '../lib/masterDataApi'
import { getDefaultAvatar } from '../lib/utils'
import { ProfileDetailsSkeleton } from '../components/skeletons'

// Decorative Botanical Leaf SVG Watermark matching 2-color brand theme (Navy Blue subtle tint)
const LeafWatermark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 200 200"
    fill="currentColor"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <path
      d="M180,180 C150,150 140,110 160,70 C165,60 175,55 185,55 C190,75 185,120 180,180 Z"
      opacity="0.18"
    />
    <path
      d="M165,140 C135,125 110,120 85,135 C75,140 70,150 72,160 C90,165 130,160 165,140 Z"
      opacity="0.16"
    />
    <path
      d="M150,110 C125,85 110,50 120,20 C125,12 135,8 145,10 C150,30 152,70 150,110 Z"
      opacity="0.14"
    />
    <path
      d="M130,155 C100,160 70,175 45,195 C38,200 30,198 28,190 C32,175 60,160 130,155 Z"
      opacity="0.14"
    />
    <path
      d="M175,175 C145,145 120,105 105,65 C100,55 102,45 110,42 C120,45 140,85 175,175 Z"
      opacity="0.12"
    />
  </svg>
)

export const MyProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active section edit modal
  type ModalType = 'header' | 'about' | 'education' | 'family' | 'horoscope' | 'contact' | 'lifestyle' | null
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Master Data Options for Dropdowns
  const [communities, setCommunities] = useState<Community[]>([])

  // Modal Form State
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  // Fetch current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getMyProfile()
        setProfile(data)
      } catch (err: any) {
        console.error('Failed to load profile:', err)
        setError(err.message || 'Failed to load your profile.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Load master data for modals
  useEffect(() => {
    masterDataApi.getCommunities().then(setCommunities).catch(() => {})
  }, [])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    showToast('success', `${fieldKey} copied to clipboard!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle Photo Upload directly via pencil icon
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file (JPG, PNG, or WEBP).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 10MB.')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const uploaded = await uploadProfilePhoto(file, true, profile?.id)
      setProfile((prev) => (prev ? { ...prev, photo_url: uploaded.storage_path } : null))
      await refreshUser()
      showToast('success', 'Profile photo updated successfully!')
    } catch (err: any) {
      console.error('Photo upload failed:', err)
      showToast('error', err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Open modal and pre-fill current values
  const openModal = (type: ModalType) => {
    if (!profile) return
    setActiveModal(type)
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      gender: profile.gender || 'MALE',
      date_of_birth: profile.date_of_birth ? String(profile.date_of_birth).split('T')[0] : '1998-05-14',
      height_cm: profile.height_cm || 165,
      profile_for: profile.profile_for || 'MYSELF',
      about_me: profile.about_me || '',
      highest_qualification: profile.highest_qualification || "Bachelor's Degree",
      occupation: profile.occupation || 'Senior Software Engineer',
      company_name: profile.company_name || 'Tata Consultancy Services',
      annual_income: profile.annual_income || '₹15 – 25 Lakhs',
      community: profile.community || 'Sadgope',
      sub_community: profile.sub_community || 'Kulin Sadgope',
      native_place: profile.native_place || 'Bardhaman',
      current_city: profile.current_city || 'Kolkata',
      current_state: profile.current_state || 'West Bengal',
      diet: profile.diet || 'NON_VEGETARIAN',
      marital_status: profile.marital_status || 'NEVER_MARRIED',
      mother_tongue: profile.mother_tongue || 'Bengali',
      status: profile.status || 'ACTIVE',
      smoking: (profile as any).smoking || 'NO',
      drinking: (profile as any).drinking || 'NO',
      rashi: (profile as any).rashi || 'Tula (Libra)',
      nakshatra: (profile as any).nakshatra || 'Swati',
      is_manglik: (profile as any).is_manglik || 'NO',
    })
  }

  const closeModal = () => {
    setActiveModal(null)
    setEditForm({})
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload: Record<string, any> = { ...editForm }
      if (payload.height_cm) payload.height_cm = parseInt(String(payload.height_cm), 10) || 165

      const updated = await updateMyProfile(payload, profile?.id)
      setProfile((prev) => ({ ...(prev || {}), ...updated } as ProfileResponse))
      await refreshUser()
      showToast('success', 'Profile information updated successfully!')
      closeModal()
    } catch (err: any) {
      console.error('Failed to update profile:', err)
      showToast('error', err.message || 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Display fields
  const displayName = profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Priyanka Pal'
  const displayAge = profile?.age || 28
  const displayHeight = profile ? formatHeight(profile.height_cm) : "5'4\" (163 cm)"
  const displayProfileId = profile?.id ? profile.id.slice(0, 8) : 'a086cdc5'
  const displayGender = profile?.gender === 'FEMALE' ? 'Female (Bride / কনে)' : 'Male (Groom / পাত্র)'
  const displayLocation = profile?.current_city
    ? `${profile.current_city}, ${profile.current_state}`
    : 'Kolkata, West Bengal'
  const displayPhoto = profile?.photo_url || getDefaultAvatar(profile?.gender)
  const displayEmail = profile?.revealed_email || user?.email || 'priyanka.ghosh@demo.com'
  const displayPhone = profile?.revealed_phone || user?.phone_number || '+91 9876543210'

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 antialiased">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => {}}
      />

      {/* Hidden File Input for DP Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 flex items-center space-x-2.5 rounded-2xl bg-navy-950/95 text-white px-5 py-3.5 shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-crimson-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-crimson-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-1 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        {loading && !profile ? (
          <ProfileDetailsSkeleton />
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 text-center border border-crimson-200 shadow-sm max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-crimson-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-navy-950 font-sans">Failed to load profile</h3>
            <p className="text-sm text-slate-600 mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-6 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* 1. TOP PROFILE SUMMARY CARD (Exact 2-Color Theme)        */}
            {/* ======================================================== */}
            <section
              aria-label="Profile Header"
              className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xs border border-slate-200/90"
            >
              {/* Botanical Leaf SVG Watermark in subtle Navy tint */}
              <LeafWatermark className="absolute -top-10 -right-10 w-72 h-72 sm:w-96 sm:h-96 text-navy-900/10" />

              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
                {/* Circular Profile Photo Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-slate-100 p-1 shadow-md overflow-hidden bg-white relative">
                    <img
                      src={displayPhoto}
                      alt={displayName}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        const target = e.currentTarget
                        const fallback = getDefaultAvatar(profile?.gender)
                        if (target.src !== fallback) target.src = fallback
                      }}
                    />

                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-navy-950/60 rounded-full flex flex-col items-center justify-center text-white text-[11px] font-bold">
                        <Loader2 className="w-6 h-6 animate-spin text-white mb-1" />
                        <span>Uploading...</span>
                      </div>
                    )}
                  </div>

                  {/* DP Pencil Button (Direct Photo Upload) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute -bottom-1 -left-1 sm:bottom-0 sm:left-0 z-20 w-9 h-9 bg-crimson-700 hover:bg-crimson-800 active:bg-crimson-900 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer border-2 border-white"
                    title="Change Profile Photo"
                    aria-label="Change Profile Photo"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Header Details */}
                <div className="flex-1 text-center md:text-left space-y-2.5 w-full">
                  {/* Row 1: Online status pill */}
                  <div className="flex items-center justify-center md:justify-start">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-navy-50 text-navy-800 border border-navy-200">
                      <span className="w-2 h-2 rounded-full bg-crimson-600 animate-pulse" />
                      <span>Online</span>
                    </span>
                  </div>

                  {/* Row 2: Name, Age, Blue Verified Badge & Header Pencil */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-sans tracking-tight">
                        {displayName}, {displayAge}
                      </h1>
                      <span title="Verified Community Profile">
                        <CheckCircle2 className="w-5 h-5 text-crimson-700 fill-crimson-700 text-white flex-shrink-0" />
                      </span>
                    </div>

                    {/* Header Card Pencil Edit Button */}
                    <button
                      type="button"
                      onClick={() => openModal('header')}
                      className="self-center sm:self-auto p-2.5 rounded-full bg-crimson-50 hover:bg-crimson-100 text-crimson-700 transition-colors shadow-2xs cursor-pointer"
                      title="Edit Basic Details"
                      aria-label="Edit Basic Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Row 3: Height, Profile ID, Gender */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-slate-600 font-medium pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <MoveVertical className="w-3.5 h-3.5 text-navy-800" />
                      <span>Height: {displayHeight}</span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-navy-800" />
                      <span>Profile ID: {displayProfileId}</span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-navy-800" />
                      <span>{displayGender}</span>
                    </span>
                  </div>

                  {/* Row 4: Pills / Tags in Consistent 2-Color Palette */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-crimson-50 px-3 py-1 text-xs font-semibold text-crimson-800 border border-crimson-200">
                      <MapPin className="w-3.5 h-3.5 text-crimson-700" />
                      <span>
                        {profile?.community || 'Sadgope'}{' '}
                        {profile?.sub_community ? `(${profile.sub_community})` : ''}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 border border-navy-200">
                      <MapPin className="w-3.5 h-3.5 text-navy-800" />
                      <span>{displayLocation}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 border border-navy-200">
                      <Home className="w-3.5 h-3.5 text-navy-800" />
                      <span>Native: {profile?.native_place || 'Bardhaman'}</span>
                    </span>
                  </div>

                  {/* Row 5: Header Bio paragraph */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1.5 line-clamp-3">
                    {profile?.about_me ||
                      'Working as a software engineering professional in Kolkata. Grounded in traditional cultural values while maintaining an open, progressive worldview. In my free time, I enjoy reading literature, exploring heritage sites, and spending quality time with family.'}
                  </p>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* 2. MIDDLE TWO-COLUMN GRID: About, Education, Family, etc. */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* LEFT COLUMN: About Me, Education & Career, Family Background, Horoscope */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                {/* ----------------- ABOUT ME CARD ----------------- */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center shadow-2xs">
                        <User className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">About Me</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModal('about')}
                      className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                      title="Edit About Me"
                      aria-label="Edit About Me"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {profile?.about_me ||
                      'Working as a software engineering professional in Kolkata. Grounded in traditional cultural values while maintaining an open, progressive worldview. In my free time, I enjoy reading literature, exploring heritage sites, and spending quality time with family.'}
                  </p>
                </div>

                {/* ------------- EDUCATION & CAREER CARD ------------- */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center shadow-2xs">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
                        Education & Career
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModal('education')}
                      className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                      title="Edit Education & Career"
                      aria-label="Edit Education & Career"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* Item 1: Highest Qualification */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Highest Qualification
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.highest_qualification || "Bachelor's Degree"}
                        </span>
                      </div>
                    </div>

                    {/* Item 2: Occupation */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Occupation
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.occupation || 'Senior Software Engineer'}
                        </span>
                      </div>
                    </div>

                    {/* Item 3: Organization / Company */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Organization / Company
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.company_name || 'Tata Consultancy Services'}
                        </span>
                      </div>
                    </div>

                    {/* Item 4: Work Location */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Work Location
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {displayLocation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------- FAMILY BACKGROUND CARD -------------- */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-crimson-700 text-white flex items-center justify-center shadow-2xs">
                        <Users className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
                        Family Background
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModal('family')}
                      className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                      title="Edit Family Background"
                      aria-label="Edit Family Background"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* Item 1: Community */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Community
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.community || 'Sadgope'}
                        </span>
                      </div>
                    </div>

                    {/* Item 2: Sub-Community */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Sub-Community
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.sub_community || 'Kulin Sadgope'}
                        </span>
                      </div>
                    </div>

                    {/* Item 3: Native Place */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Native Place
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {profile?.native_place || 'Bardhaman'}
                        </span>
                      </div>
                    </div>

                    {/* Item 4: Current Residence */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Current Residence
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {displayLocation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------- HOROSCOPE & ASTROLOGY CARD -------------- */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center shadow-2xs">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
                        Horoscope & Astrology Details
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModal('horoscope')}
                      className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                      title="Edit Horoscope Details"
                      aria-label="Edit Horoscope Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                    {/* Item 1: Rashi */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Rashi (Moon Sign)
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {(profile as any)?.rashi || 'Tula (Libra)'}
                        </span>
                      </div>
                    </div>

                    {/* Item 2: Nakshatra */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Nakshatra
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {(profile as any)?.nakshatra || 'Swati'}
                        </span>
                      </div>
                    </div>

                    {/* Item 3: Manglik Status */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] sm:text-xs font-medium text-slate-400">
                          Manglik Status
                        </span>
                        <span className="block text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                          {(profile as any)?.is_manglik === 'YES' ? 'Manglik' : (profile as any)?.is_manglik === 'NO' ? 'Non-Manglik' : 'Not Known'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Contact Information & Add Profile Photo Promo */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                {/* ------------- CONTACT INFORMATION CARD ------------- */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-crimson-700 text-white flex items-center justify-center shadow-2xs">
                        <Phone className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
                        Contact Information
                      </h2>
                    </div>
                    {/* Pencil Edit Icon for Contact Information (Address editable) */}
                    <button
                      type="button"
                      onClick={() => openModal('contact')}
                      className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                      title="Edit Address Details"
                      aria-label="Edit Address Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {/* Row 1: Email (Read-Only) */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-semibold text-navy-800">
                            Email
                          </span>
                          <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {displayEmail}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(displayEmail, 'Email')}
                        className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-200/70 rounded-lg transition-colors flex-shrink-0 ml-2 cursor-pointer"
                        title="Copy Email"
                        aria-label="Copy Email"
                      >
                        {copiedField === 'Email' ? (
                          <Check className="w-4 h-4 text-crimson-700" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Row 2: Family Phone (Read-Only) */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-medium text-slate-400">
                            Family Phone
                          </span>
                          <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {displayPhone}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(displayPhone, 'Phone')}
                        className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-200/70 rounded-lg transition-colors flex-shrink-0 ml-2 cursor-pointer"
                        title="Copy Phone"
                        aria-label="Copy Phone"
                      >
                        {copiedField === 'Phone' ? (
                          <Check className="w-4 h-4 text-crimson-700" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Row 3: Address (Editable via pencil!) */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-medium text-slate-400">
                            Address
                          </span>
                          <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            Family Address: {displayLocation}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`Family Address: ${displayLocation}`, 'Address')}
                        className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-200/70 rounded-lg transition-colors flex-shrink-0 ml-2 cursor-pointer"
                        title="Copy Address"
                        aria-label="Copy Address"
                      >
                        {copiedField === 'Address' ? (
                          <Check className="w-4 h-4 text-crimson-700" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* PHOTO PROMO BANNER (Exact 2-Color Design) */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-50 to-slate-50 border border-navy-100 p-4 flex items-center justify-between shadow-2xs mt-4">
                      {/* Leaf Watermark */}
                      <LeafWatermark className="absolute -bottom-4 -right-4 w-32 h-32 text-navy-800/10" />

                      <div className="relative z-10 flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-navy-950 font-sans">
                            You can add your profile photo
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                            Make your profile more personal and help others know you better.
                          </p>
                        </div>
                      </div>

                      {/* Pencil Button for Photo Upload */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="relative z-10 w-9 h-9 rounded-xl bg-crimson-700 hover:bg-crimson-800 active:bg-crimson-900 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 flex-shrink-0 ml-3 cursor-pointer"
                        title="Upload Profile Photo"
                        aria-label="Upload Profile Photo"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 3. BOTTOM FULL-WIDTH: Personal Details & Lifestyle       */}
            {/* ======================================================== */}
            <section
              aria-label="Personal Details & Lifestyle"
              className="mt-6 rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center shadow-2xs">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
                    Personal Details & Lifestyle
                  </h2>
                </div>
                {/* Pencil Edit Icon for Personal Details & Lifestyle */}
                <button
                  type="button"
                  onClick={() => openModal('lifestyle')}
                  className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-crimson-50 rounded-full transition-colors cursor-pointer"
                  title="Edit Personal Details & Lifestyle"
                  aria-label="Edit Personal Details & Lifestyle"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* 6 Grid Items horizontally aligned in consistent 2-Color Palette */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                {/* 1. Diet */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Diet</span>
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-tight truncate">
                      {profile?.diet || 'NON_VEGETARIAN'}
                    </span>
                  </div>
                </div>

                {/* 2. Marital Status */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
                    <Gem className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Marital Status</span>
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-tight truncate">
                      {(profile?.marital_status || 'NEVER_MARRIED').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* 3. Mother Tongue */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Mother Tongue</span>
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      {profile?.mother_tongue || 'Bengali'}
                    </span>
                  </div>
                </div>

                {/* 4. Height */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Height</span>
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      {displayHeight}
                    </span>
                  </div>
                </div>

                {/* 5. Profile Managed By */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Profile Managed By</span>
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-tight truncate">
                      {(profile?.profile_for || 'MYSELF').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* 6. Status */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-crimson-700" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-400">Status</span>
                    <span className="block text-xs font-bold text-crimson-700 uppercase tracking-tight truncate">
                      {(profile?.status || 'ACTIVE').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* Language Selector Modal */}
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />

      {/* ======================================================== */}
      {/* 4. EDIT SECTION MODALS                                  */}
      {/* ======================================================== */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-navy-950 font-sans">
                  {activeModal === 'header' && 'Edit Basic Information'}
                  {activeModal === 'about' && 'Edit About Me'}
                  {activeModal === 'education' && 'Edit Education & Career'}
                  {activeModal === 'family' && 'Edit Family Background'}
                  {activeModal === 'horoscope' && 'Edit Horoscope Details'}
                  {activeModal === 'contact' && 'Edit Contact Address'}
                  {activeModal === 'lifestyle' && 'Edit Personal Details & Lifestyle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* MODAL 1: HEADER BASIC INFO */}
              {activeModal === 'header' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                      <select
                        value={editForm.gender || 'MALE'}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        <option value="MALE">Male (Groom / পাত্র)</option>
                        <option value="FEMALE">Female (Bride / কনে)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={editForm.date_of_birth || ''}
                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Community</label>
                      <select
                        value={editForm.community || ''}
                        onChange={(e) => setEditForm({ ...editForm, community: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        {communities.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Community</label>
                      <input
                        type="text"
                        value={editForm.sub_community || ''}
                        onChange={(e) => setEditForm({ ...editForm, sub_community: e.target.value })}
                        placeholder="e.g. Kulin Sadgope"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Current City</label>
                      <input
                        type="text"
                        value={editForm.current_city || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_city: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Current State</label>
                      <input
                        type="text"
                        value={editForm.current_state || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_state: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Native Place</label>
                    <input
                      type="text"
                      value={editForm.native_place || ''}
                      onChange={(e) => setEditForm({ ...editForm, native_place: e.target.value })}
                      placeholder="e.g. Bardhaman, Bankura, Hooghly"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                </div>
              )}

              {/* MODAL 2: ABOUT ME */}
              {activeModal === 'about' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">About Me (Bio)</label>
                    <textarea
                      rows={6}
                      value={editForm.about_me || ''}
                      onChange={(e) => setEditForm({ ...editForm, about_me: e.target.value })}
                      placeholder="Describe your background, personality, family values and interests..."
                      className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* MODAL 3: EDUCATION & CAREER */}
              {activeModal === 'education' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Qualification</label>
                    <input
                      type="text"
                      value={editForm.highest_qualification || ''}
                      onChange={(e) => setEditForm({ ...editForm, highest_qualification: e.target.value })}
                      placeholder="e.g. B.Tech, M.Tech, MBA, MBBS"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation / Profession</label>
                    <input
                      type="text"
                      value={editForm.occupation || ''}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={editForm.company_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      placeholder="e.g. Leading Tech Corp"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Income</label>
                    <input
                      type="text"
                      value={editForm.annual_income || ''}
                      onChange={(e) => setEditForm({ ...editForm, annual_income: e.target.value })}
                      placeholder="e.g. ₹15 – 25 Lakhs"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                </div>
              )}

              {/* MODAL 4: FAMILY BACKGROUND */}
              {activeModal === 'family' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Community</label>
                      <input
                        type="text"
                        value={editForm.community || ''}
                        onChange={(e) => setEditForm({ ...editForm, community: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Community</label>
                      <input
                        type="text"
                        value={editForm.sub_community || ''}
                        onChange={(e) => setEditForm({ ...editForm, sub_community: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Native Place</label>
                    <input
                      type="text"
                      value={editForm.native_place || ''}
                      onChange={(e) => setEditForm({ ...editForm, native_place: e.target.value })}
                      placeholder="e.g. Bardhaman, West Bengal"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Current City</label>
                      <input
                        type="text"
                        value={editForm.current_city || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_city: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Current State</label>
                      <input
                        type="text"
                        value={editForm.current_state || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_state: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 5: HOROSCOPE */}
              {activeModal === 'horoscope' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rashi (Zodiac Moon Sign)</label>
                    <input
                      type="text"
                      value={editForm.rashi || ''}
                      onChange={(e) => setEditForm({ ...editForm, rashi: e.target.value })}
                      placeholder="e.g. Tula (Libra), Mesha, Kanya"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nakshatra (Birth Star)</label>
                    <input
                      type="text"
                      value={editForm.nakshatra || ''}
                      onChange={(e) => setEditForm({ ...editForm, nakshatra: e.target.value })}
                      placeholder="e.g. Swati, Rohini, Ashwini"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Manglik Status</label>
                    <select
                      value={editForm.is_manglik || 'NO'}
                      onChange={(e) => setEditForm({ ...editForm, is_manglik: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    >
                      <option value="NO">Non-Manglik (No)</option>
                      <option value="YES">Manglik (Yes)</option>
                      <option value="ANSHIK">Anshik Manglik (Partial)</option>
                      <option value="DONT_KNOW">Don\'t Know</option>
                    </select>
                  </div>
                </div>
              )}

              {/* MODAL 6: CONTACT INFORMATION */}
              {activeModal === 'contact' && (
                <div className="space-y-4">
                  {/* Read-Only Notice */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 text-xs text-slate-600">
                    <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>
                      For security, registered <strong>Email</strong> and <strong>Phone Number</strong> cannot be changed here. Address and residential details are editable below.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Registered Email (Read-Only)</label>
                    <input
                      type="email"
                      disabled
                      value={displayEmail}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Family Phone (Read-Only)</label>
                    <input
                      type="text"
                      disabled
                      value={displayPhone}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                    <textarea
                      rows={2}
                      value={editForm.current_city ? `${editForm.current_city}, ${editForm.current_state}` : ''}
                      onChange={(e) => {
                        const parts = e.target.value.split(',')
                        setEditForm({
                          ...editForm,
                          current_city: parts[0]?.trim() || '',
                          current_state: parts[1]?.trim() || editForm.current_state,
                        })
                      }}
                      placeholder="e.g. Salt Lake Sector V, Kolkata"
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                    />
                  </div>
                </div>
              )}

              {/* MODAL 7: PERSONAL DETAILS & LIFESTYLE */}
              {activeModal === 'lifestyle' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Diet</label>
                      <select
                        value={editForm.diet || 'NON_VEGETARIAN'}
                        onChange={(e) => setEditForm({ ...editForm, diet: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        <option value="VEGETARIAN">Vegetarian</option>
                        <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                        <option value="EGGETARIAN">Eggetarian</option>
                        <option value="JAIN">Jain</option>
                        <option value="VEGAN">Vegan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                      <select
                        value={editForm.marital_status || 'NEVER_MARRIED'}
                        onChange={(e) => setEditForm({ ...editForm, marital_status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        <option value="NEVER_MARRIED">Never Married</option>
                        <option value="DIVORCED">Divorced</option>
                        <option value="WIDOWED">Widowed</option>
                        <option value="AWAITING_DIVORCE">Awaiting Divorce</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mother Tongue</label>
                      <input
                        type="text"
                        value={editForm.mother_tongue || 'Bengali'}
                        onChange={(e) => setEditForm({ ...editForm, mother_tongue: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={editForm.height_cm || 165}
                        onChange={(e) => setEditForm({ ...editForm, height_cm: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Profile Managed By</label>
                      <select
                        value={editForm.profile_for || 'MYSELF'}
                        onChange={(e) => setEditForm({ ...editForm, profile_for: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        <option value="MYSELF">Self (Myself)</option>
                        <option value="PARENTS">Parents</option>
                        <option value="SIBLING">Sibling (Brother / Sister)</option>
                        <option value="RELATIVE">Relative</option>
                        <option value="FRIEND">Friend</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                      <select
                        value={editForm.status || 'ACTIVE'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 focus:border-crimson-700"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="HIDDEN">Hidden</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-crimson-700 hover:bg-crimson-800 active:bg-crimson-900 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
