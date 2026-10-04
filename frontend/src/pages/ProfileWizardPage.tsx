import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal'
import { ProtectedPhoto } from '../components/security/ProtectedPhoto'
import {
  User,
  Users,
  GraduationCap,
  Heart,
  Moon,
  Camera,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Sparkles,
  Upload,
  Plus,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { getMyProfile, updateMyProfile } from '../lib/authApi'
import {
  getMyPhotos,
  uploadProfilePhoto,
  deleteProfilePhoto,
  setPrimaryPhoto,
} from '../lib/profileApi'
import { masterDataApi, type Community, type SubCommunity, type SelectOption } from '../lib/masterDataApi'
import { useAuth } from '../context/AuthContext'

export const ProfileWizardPage: React.FC = () => {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const totalSteps = 7

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic
    profileFor: 'MYSELF',
    firstName: 'Priyanka',
    lastName: 'Ghosh',
    gender: 'FEMALE',
    dob: '1998-05-14',
    heightCm: '163',
    maritalStatus: 'NEVER_MARRIED',
    hasChildren: 'NO',
    motherTongue: 'Bengali',

    // Step 2: Community
    community: 'Sadgope',
    subCommunity: 'Kulin Sadgope',
    nativePlace: 'Bardhaman',
    familyOriginState: 'West Bengal',
    currentState: 'West Bengal',
    currentCity: 'Kolkata',
    gotra: 'Kashyapa',

    // Step 3: Education & Career
    highestQualification: 'M.Tech in Computer Science',
    college: 'Jadavpur University',
    occupation: 'Senior Software Engineer',
    company: 'Tata Consultancy Services',
    annualIncome: '₹15 – 25 Lakhs',
    workLocation: 'Kolkata',

    // Step 4: Family
    fatherOccupation: 'Retired Government Officer',
    motherOccupation: 'Homemaker',
    brothersCount: '1',
    sistersCount: '0',
    familyType: 'NUCLEAR',
    familyValues: 'TRADITIONAL',
    familyLocation: 'Bardhaman, West Bengal',

    // Step 5: Lifestyle & Bio
    diet: 'NON_VEGETARIAN',
    smoking: 'NO',
    drinking: 'NO',
    hobbies: ['Classical Music', 'Traveling', 'Bengali Literature', 'Cooking'],
    aboutMe:
      'Working as a software engineering professional in Kolkata. Grounded in traditional cultural values while maintaining an open, progressive worldview. In my free time, I enjoy reading literature, exploring heritage sites, and spending quality time with family.',

    // Step 6: Horoscope (Optional)
    includeHoroscope: true,
    timeOfBirth: '06:45',
    placeOfBirth: 'Bardhaman',
    rashi: 'Tula (Libra)',
    nakshatra: 'Swati',
    isManglik: 'NO',

    // Step 7: Privacy & Photos
    nameDisplay: 'FIRST_NAME_ONLY',
    photoPrivacy: 'REGISTERED_ONLY',
    phonePrivacy: 'PREMIUM_ONLY',
    emailPrivacy: 'PRIVATE',
  })

  // Photo management state
  interface WizardPhoto {
    id?: string
    url: string
    isPrimary: boolean
  }

  const [photos, setPhotos] = useState<WizardPhoto[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [heightOptions, setHeightOptions] = useState<SelectOption[]>([])
  const [maritalStatuses, setMaritalStatuses] = useState<SelectOption[]>([])
  const [motherTongues, setMotherTongues] = useState<string[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [subCommunities, setSubCommunities] = useState<SubCommunity[]>([])
  const [states, setStates] = useState<SelectOption[]>([])
  const [educationLevels, setEducationLevels] = useState<SelectOption[]>([])
  const [incomeRanges, setIncomeRanges] = useState<SelectOption[]>([])
  const [dietOptions, setDietOptions] = useState<SelectOption[]>([])

  useEffect(() => {
    masterDataApi.getHeightOptions().then(setHeightOptions).catch(() => {})
    masterDataApi.getMaritalStatuses().then(setMaritalStatuses).catch(() => {})
    masterDataApi.getMotherTongueOptions().then(setMotherTongues).catch(() => {})
    masterDataApi.getCommunities().then(setCommunities).catch(() => {})
    masterDataApi.getStates().then(setStates).catch(() => {})
    masterDataApi.getEducationLevels().then(setEducationLevels).catch(() => {})
    masterDataApi.getIncomeRanges().then(setIncomeRanges).catch(() => {})
    masterDataApi.getDietOptions().then(setDietOptions).catch(() => {})
  }, [])

  useEffect(() => {
    const commId = communities.find(c => c.name === formData.community)?.id
    masterDataApi.getSubCommunities(commId).then(setSubCommunities).catch(() => {})
  }, [formData.community, communities])

  // Calculate dynamic completion percentage matching backend algorithm
  const calculateCompletion = () => {
    let score = 20
    if (formData.firstName && formData.lastName) score += 10
    if (formData.gender && formData.dob) score += 10
    if (formData.heightCm && formData.maritalStatus) score += 5
    if (formData.community) score += 5
    if (formData.subCommunity) score += 5
    if (formData.currentState && formData.currentCity) score += 10
    if (formData.nativePlace) score += 5
    if (formData.highestQualification && formData.occupation) score += 10
    if (formData.company || formData.annualIncome) score += 5
    if (formData.aboutMe && formData.aboutMe.trim().length >= 20) score += 10
    if (formData.rashi || formData.nakshatra || (formData.isManglik && formData.isManglik !== 'DONT_KNOW')) score += 5
    if (photos.length > 0) score += 10
    return Math.min(Math.max(score, 20), 100)
  }

  const completionPct = calculateCompletion()

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setPhotoError(null)
    const file = files[0]

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image size exceeds 10MB limit. Please choose a smaller file.')
      return
    }

    if (photos.length >= 5) {
      setPhotoError('You can upload up to 5 photos. Please remove an existing photo first.')
      return
    }

    setIsUploadingPhoto(true)
    const isFirstPhoto = photos.length === 0

    try {
      const uploaded = await uploadProfilePhoto(file, isFirstPhoto)
      setPhotos((prev) => [
        ...prev,
        {
          id: uploaded.id,
          url: uploaded.storage_path,
          isPrimary: uploaded.is_primary,
        },
      ])
      await refreshUser()
    } catch (err: any) {
      console.warn('Backend photo upload error, reading as local preview:', err)
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [
            ...prev,
            {
              url: reader.result as string,
              isPrimary: isFirstPhoto,
            },
          ])
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSetPrimaryPhoto = async (index: number) => {
    const target = photos[index]
    if (target?.id) {
      try {
        await setPrimaryPhoto(target.id)
        await refreshUser()
      } catch (e) {
        console.error('Failed to set primary photo on backend:', e)
      }
    }
    setPhotos((prev) =>
      prev.map((p, idx) => ({
        ...p,
        isPrimary: idx === index,
      }))
    )
  }

  const handleDeletePhoto = async (index: number) => {
    const target = photos[index]
    if (target?.id) {
      try {
        await deleteProfilePhoto(target.id)
        await refreshUser()
      } catch (e) {
        console.error('Failed to delete photo on backend:', e)
      }
    }
    setPhotos((prev) => {
      const updated = prev.filter((_, idx) => idx !== index)
      if (target?.isPrimary && updated.length > 0) {
        updated[0].isPrimary = true
      }
      return updated
    })
  }

  const handleAddSamplePhoto = () => {
    if (photos.length >= 5) {
      setPhotoError('Maximum of 5 photos reached.')
      return
    }
    const samples = [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    ]
    const next = samples[photos.length % samples.length]
    setPhotos((prev) => [
      ...prev,
      {
        url: next,
        isPrimary: prev.length === 0,
      },
    ])
  }

  useEffect(() => {
    getMyPhotos()
      .then((items) => {
        if (items && items.length > 0) {
          setPhotos(
            items.map((it) => ({
              id: it.id,
              url: it.storage_path,
              isPrimary: it.is_primary,
            }))
          )
        }
      })
      .catch(() => {})

    getMyProfile()
      .then((p) => {
        if (p) {
          if (p.photos && p.photos.length > 0) {
            setPhotos(
              p.photos.map((it: any) => ({
                id: it.id,
                url: it.storage_path,
                isPrimary: it.is_primary,
              }))
            )
          }
          setFormData((prev) => ({
            ...prev,
            profileFor: p.profile_for || prev.profileFor,
            firstName: p.first_name || prev.firstName,
            lastName: p.last_name || prev.lastName,
            gender: p.gender || prev.gender,
            dob: p.date_of_birth ? String(p.date_of_birth) : prev.dob,
            heightCm: p.height_cm ? String(p.height_cm) : prev.heightCm,
            maritalStatus: p.marital_status || prev.maritalStatus,
            motherTongue: p.mother_tongue || prev.motherTongue,
            community: p.community || prev.community,
            subCommunity: p.sub_community || prev.subCommunity,
            nativePlace: p.native_place || prev.nativePlace,
            currentState: p.current_state || prev.currentState,
            currentCity: p.current_city || prev.currentCity,
            highestQualification: p.highest_qualification || prev.highestQualification,
            occupation: p.occupation || prev.occupation,
            company: p.company_name || prev.company,
            annualIncome: p.annual_income || prev.annualIncome,
            diet: p.diet || prev.diet,
            smoking: p.smoking || prev.smoking,
            drinking: p.drinking || prev.drinking,
            rashi: p.rashi || prev.rashi,
            nakshatra: p.nakshatra || prev.nakshatra,
            isManglik: p.is_manglik || prev.isManglik,
            aboutMe: p.about_me || prev.aboutMe,
          }))
        }
      })
      .catch(() => {})
  }, [])

  const [saveToast, setSaveToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setSaveToast({ type, message })
    setTimeout(() => setSaveToast(null), 3500)
  }

  const saveProfileData = async (shouldNavigate = false): Promise<boolean> => {
    setIsSaving(true)
    const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0]
    try {
      await updateMyProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formData.dob,
        height_cm: parseInt(formData.heightCm, 10) || 165,
        marital_status: formData.maritalStatus,
        mother_tongue: formData.motherTongue,
        community: formData.community,
        sub_community: formData.subCommunity,
        native_place: formData.nativePlace,
        current_state: formData.currentState,
        current_city: formData.currentCity,
        highest_qualification: formData.highestQualification,
        occupation: formData.occupation,
        company_name: formData.company,
        annual_income: formData.annualIncome,
        diet: formData.diet,
        smoking: formData.smoking,
        drinking: formData.drinking,
        rashi: formData.rashi,
        nakshatra: formData.nakshatra,
        is_manglik: formData.isManglik,
        about_me: formData.aboutMe,
        photo_url: primaryPhoto?.url,
      })
      await refreshUser()
      showToast('success', 'Profile saved successfully!')
      if (shouldNavigate) {
        setTimeout(() => navigate('/dashboard'), 800)
      }
      return true
    } catch (e: any) {
      console.error('Failed to save profile updates:', e)
      showToast('error', e.message || 'Failed to save changes. Please try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = async () => {
    const isLastStep = currentStep === totalSteps
    const success = await saveProfileData(isLastStep)
    if (success && !isLastStep) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const stepTitles = [
    'Basic Details',
    'Community & Origin',
    'Education & Career',
    'Family Background',
    'Lifestyle & Bio',
    'Horoscope (Optional)',
    'Photos & Privacy Shield',
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
      <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />

      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Top Progress & Completion Banner */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-crimson-700 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                </span>
              </span>
              <h1 className="text-2xl font-black text-navy-950 font-serif mt-0.5">
                Complete Your Matrimonial Profile
              </h1>
            </div>

            <div className="sm:text-right">
              <div className="text-xs font-bold text-slate-600">
                Profile Completion:{' '}
                <span className="text-crimson-700 text-sm font-black">{completionPct}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Profiles above 80% receive 4x more interests
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-crimson-600 via-crimson-700 to-navy-900 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Pills */}
          <div className="hidden sm:grid grid-cols-7 gap-1 mt-4 text-[10px] font-bold text-center">
            {stepTitles.map((title, idx) => {
              const isPast = idx + 1 < currentStep
              const isCurrent = idx + 1 === currentStep
              return (
                <div
                  key={idx}
                  onClick={async () => {
                    await saveProfileData(false)
                    setCurrentStep(idx + 1)
                  }}
                  className={`cursor-pointer py-1.5 px-1 rounded-lg transition-all truncate ${
                    isCurrent
                      ? 'bg-crimson-700 text-white shadow-xs'
                      : isPast
                      ? 'bg-navy-50 text-navy-900 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {idx + 1}. {title.split(' ')[0]}
                </div>
              )
            })}
          </div>
        </div>

        {/* Wizard Card Body */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-slate-200">
          {/* STEP 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <User className="h-5 w-5 text-crimson-700" />
                  <span>1. Basic Personal Information</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tell us basic information about the prospective candidate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Who is this profile for? *
                  </label>
                  <select
                    value={formData.profileFor}
                    onChange={(e) => setFormData({ ...formData, profileFor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="MYSELF">Myself</option>
                    <option value="SON">My Son</option>
                    <option value="DAUGHTER">My Daughter</option>
                    <option value="BROTHER">My Brother</option>
                    <option value="SISTER">My Sister</option>
                    <option value="RELATIVE">Relative</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="FEMALE">Female (Bride)</option>
                    <option value="MALE">Male (Groom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Height (cm) *
                  </label>
                  <select
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{heightOptions.length > 0 ? 'Select Height' : 'Loading...'}</option>
                    {heightOptions.map((h) => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marital Status *
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{maritalStatuses.length > 0 ? 'Select Marital Status' : 'Loading...'}</option>
                    {maritalStatuses.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mother Tongue *
                  </label>
                  <select
                    value={formData.motherTongue}
                    onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{motherTongues.length > 0 ? 'Select Mother Tongue' : 'Loading...'}</option>
                    {motherTongues.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Community & Origin */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <Users className="h-5 w-5 text-crimson-700" />
                  <span>2. Community, Native Place & Roots</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Community-specific lineage and native origin are central to respectful matrimonial alliances.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Community *
                  </label>
                  <select
                    value={formData.community}
                    onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{communities.length > 0 ? 'Select Community' : 'Loading...'}</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sub-Community *
                  </label>
                  <select
                    value={formData.subCommunity}
                    onChange={(e) => setFormData({ ...formData, subCommunity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{subCommunities.length > 0 ? 'Select Sub-Community' : 'Loading...'}</option>
                    {subCommunities.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Native Place / ancestral roots *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bardhaman, Medinipur, Balasore, Ranchi"
                    value={formData.nativePlace}
                    onChange={(e) => setFormData({ ...formData, nativePlace: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gotra (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kashyapa, Sandilya, Alambayana"
                    value={formData.gotra}
                    onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Living State *
                  </label>
                  <select
                    value={formData.currentState}
                    onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{states.length > 0 ? 'Select State' : 'Loading...'}</option>
                    {states.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kolkata, Bhubaneswar, Ranchi"
                    value={formData.currentCity}
                    onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Education & Career */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-crimson-700" />
                  <span>3. Education & Professional Career</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Professional qualifications and career stability provide peace of mind to visiting families.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Highest Qualification *
                  </label>
                  <select
                    value={formData.highestQualification}
                    onChange={(e) =>
                      setFormData({ ...formData, highestQualification: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{educationLevels.length > 0 ? 'Select Qualification' : 'Loading...'}</option>
                    {educationLevels.map((eL) => (
                      <option key={eL.value} value={eL.value}>{eL.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / University Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jadavpur University, Calcutta University"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Occupation / Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer, Govt Teacher"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Consultancy Services, Public Sector"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Income Range *
                  </label>
                  <select
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{incomeRanges.length > 0 ? 'Select Income Range' : 'Loading...'}</option>
                    {incomeRanges.map((iR) => (
                      <option key={iR.value} value={iR.value}>{iR.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Location City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kolkata, Bangalore, Mumbai, Remote"
                    value={formData.workLocation}
                    onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Family Details */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <Users className="h-5 w-5 text-crimson-700" />
                  <span>4. Family Background & Values</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Matrimony is a sacred union of two families. Share insights into your family structure.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Father's Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Retired Govt Officer, Businessman"
                    value={formData.fatherOccupation}
                    onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mother's Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Homemaker, Teacher, Bank Official"
                    value={formData.motherOccupation}
                    onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Family Type
                  </label>
                  <select
                    value={formData.familyType}
                    onChange={(e) => setFormData({ ...formData, familyType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="NUCLEAR">Nuclear Family</option>
                    <option value="JOINT">Joint Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Family Values
                  </label>
                  <select
                    value={formData.familyValues}
                    onChange={(e) => setFormData({ ...formData, familyValues: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="TRADITIONAL">Traditional & Cultured</option>
                    <option value="MODERATE">Moderate Progressive</option>
                    <option value="LIBERAL">Liberal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brothers Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.brothersCount}
                    onChange={(e) => setFormData({ ...formData, brothersCount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sisters Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.sistersCount}
                    onChange={(e) => setFormData({ ...formData, sistersCount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Lifestyle & Bio */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-crimson-700" />
                  <span>5. Lifestyle & "About Me"</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  A sincere, well-written bio helps prospective matches understand your nature and life goals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Diet *</label>
                  <select
                    value={formData.diet}
                    onChange={(e) => setFormData({ ...formData, diet: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="">{dietOptions.length > 0 ? 'Select Diet' : 'Loading...'}</option>
                    {dietOptions.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Smoking</label>
                  <select
                    value={formData.smoking}
                    onChange={(e) => setFormData({ ...formData, smoking: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="NO">No</option>
                    <option value="OCCASIONALLY">Occasionally</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Drinking</label>
                  <select
                    value={formData.drinking}
                    onChange={(e) => setFormData({ ...formData, drinking: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                  >
                    <option value="NO">No</option>
                    <option value="OCCASIONALLY">Occasionally</option>
                  </select>
                </div>
              </div>

              {/* Bio & Writing Assistance Prompts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    About Me (In your own words) *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {formData.aboutMe.length} characters
                  </span>
                </div>

                {/* Prompt Assistance Box */}
                <div className="rounded-xl bg-navy-50/70 p-3 mb-2.5 border border-navy-200/80 text-xs text-navy-950 space-y-1">
                  <span className="font-bold flex items-center space-x-1">
                    <Sparkles className="h-3.5 w-3.5 text-crimson-700" />
                    <span>Helpful writing tips:</span>
                  </span>
                  <p className="text-[11px] text-slate-600">
                    • Describe your nature, interests, and how you spend weekends.
                    <br />
                    • Mention your family values, educational background, and respect for community traditions.
                    <br />
                    • State what kind of mutual understanding and values you seek in a life partner.
                  </p>
                </div>

                <textarea
                  rows={4}
                  required
                  value={formData.aboutMe}
                  onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                  placeholder="Share a heartfelt description about yourself, your aspirations, and your partner expectations..."
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs leading-relaxed text-slate-800 focus:border-crimson-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 6: Optional Horoscope Details */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                    <Moon className="h-5 w-5 text-crimson-700" />
                    <span>6. Horoscope / Kundali (Optional)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    In traditional marriages, many families request Kundali matching. You can keep this optional.
                  </p>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeHoroscope}
                    onChange={(e) =>
                      setFormData({ ...formData, includeHoroscope: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-crimson-700 focus:ring-crimson-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Include Horoscope</span>
                </label>
              </div>

              {formData.includeHoroscope ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Time of Birth
                    </label>
                    <input
                      type="time"
                      value={formData.timeOfBirth}
                      onChange={(e) => setFormData({ ...formData, timeOfBirth: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Place of Birth
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bardhaman, Kolkata"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rashi</label>
                    <select
                      value={formData.rashi}
                      onChange={(e) => setFormData({ ...formData, rashi: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="Mesh (Aries)">Mesh (Aries)</option>
                      <option value="Brish (Taurus)">Brish (Taurus)</option>
                      <option value="Mithun (Gemini)">Mithun (Gemini)</option>
                      <option value="Karkat (Cancer)">Karkat (Cancer)</option>
                      <option value="Simha (Leo)">Simha (Leo)</option>
                      <option value="Kanya (Virgo)">Kanya (Virgo)</option>
                      <option value="Tula (Libra)">Tula (Libra)</option>
                      <option value="Brischik (Scorpio)">Brischik (Scorpio)</option>
                      <option value="Dhanu (Sagittarius)">Dhanu (Sagittarius)</option>
                      <option value="Makar (Capricorn)">Makar (Capricorn)</option>
                      <option value="Kumbha (Aquarius)">Kumbha (Aquarius)</option>
                      <option value="Meen (Pisces)">Meen (Pisces)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Manglik Status
                    </label>
                    <select
                      value={formData.isManglik}
                      onChange={(e) => setFormData({ ...formData, isManglik: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="NO">No (Non-Manglik)</option>
                      <option value="YES">Yes (Manglik)</option>
                      <option value="ANSHIK">Anshik (Partial)</option>
                      <option value="DONT_KNOW">Don't Know</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500 border border-slate-200">
                  Horoscope details are marked as private and omitted. You can enable them anytime later.
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Photos & Privacy Protection Shield */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xl font-bold text-slate-900 font-serif flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-crimson-700" />
                  <span>7. Profile Photos & Privacy Protection Shield</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload photos with automatic anti-download watermark protection and configure who can see your contact info.
                </p>
              </div>

              {/* Hidden Local File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLocalFileUpload}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
              />

              {/* Photo Upload & Gallery */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Uploaded Photos ({photos.length} / 5)
                    </span>
                    <span className="text-[11px] text-slate-500 ml-2">
                      (Your primary photo will be shown on match cards)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto || photos.length >= 5}
                      className="inline-flex items-center space-x-1.5 rounded-xl bg-crimson-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-crimson-800 disabled:opacity-50 transition-all shadow-xs"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{isUploadingPhoto ? 'Uploading Photo...' : 'Upload Photo from Device'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddSamplePhoto}
                      disabled={photos.length >= 5}
                      className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      title="Add a sample photo for demo"
                    >
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      <span>Use Demo Sample</span>
                    </button>
                  </div>
                </div>

                {photoError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center justify-between">
                    <span>{photoError}</span>
                    <button type="button" onClick={() => setPhotoError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
                  </div>
                )}

                {/* Empty State / Dropzone when no photos uploaded */}
                {photos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-crimson-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-rose-50/20 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-crimson-700">
                      <Camera className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-bold text-navy-950">
                      Choose Photo from Your Computer or Phone
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Upload clear portrait photos. Supports JPG, PNG, WEBP (up to 10MB). Photos are protected with watermarks.
                    </p>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-crimson-700 hover:bg-crimson-800 text-white font-bold text-xs rounded-xl shadow-xs pointer-events-none"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Browse Photo from Device</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {photos.map((item, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-2xl overflow-hidden border-2 bg-slate-100 h-44 ${
                          item.isPrimary
                            ? 'border-crimson-700 ring-2 ring-crimson-200'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Protected Photo Component with Watermark and Anti-Save Shield */}
                        <ProtectedPhoto
                          src={item.url}
                          alt="Profile photo"
                          profileId="BK-MEMBER"
                          className="h-full w-full"
                        />

                        {/* Primary Badge */}
                        {item.isPrimary && (
                          <div className="absolute top-2 left-2 z-30 rounded-md bg-crimson-700 px-2 py-0.5 text-[9px] font-black text-white uppercase shadow-xs">
                            Primary Photo
                          </div>
                        )}

                        {/* Controls on hover */}
                        <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between gap-1">
                          {!item.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPhoto(idx)}
                              className="rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-900"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(idx)}
                            className="rounded-lg bg-rose-600/90 p-1 text-white hover:bg-rose-700 ml-auto"
                            title="Delete photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add More Tile */}
                    {photos.length < 5 && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-crimson-500 rounded-2xl h-44 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-rose-50/20 text-slate-500 hover:text-crimson-700"
                      >
                        <Plus className="h-6 w-6 mb-1" />
                        <span className="text-xs font-bold">Add Photo</span>
                        <span className="text-[10px] text-slate-400">From device</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Anti-Download Shield Notice */}
              <div className="rounded-2xl bg-navy-50/80 p-4 border border-navy-200 flex items-start space-x-3 text-xs text-navy-950">
                <ShieldCheck className="h-5 w-5 text-crimson-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold">Anti-Download & Screenshot Shield Active</h4>
                  <p className="text-[11px] text-navy-900/80 leading-relaxed">
                    All photos uploaded to BorKonya are served with dynamic copyright watermarks, right-click context menu prevention, and browser drag-and-drop restrictions.
                  </p>
                </div>
              </div>

              {/* Granular Privacy Controls */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  Field-Level Privacy Controls
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Photo Visibility
                    </label>
                    <select
                      value={formData.photoPrivacy}
                      onChange={(e) =>
                        setFormData({ ...formData, photoPrivacy: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="REGISTERED_ONLY">Registered Members Only</option>
                      <option value="PUBLIC">Visible to All</option>
                      <option value="PROTECTED">Protected (Blur until Interest)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number Visibility
                    </label>
                    <select
                      value={formData.phonePrivacy}
                      onChange={(e) =>
                        setFormData({ ...formData, phonePrivacy: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="PREMIUM_ONLY">Premium Members Only</option>
                      <option value="ON_INTEREST">On Mutual Accepted Interest Only</option>
                      <option value="PRIVATE">Strictly Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Name Display Format
                    </label>
                    <select
                      value={formData.nameDisplay}
                      onChange={(e) =>
                        setFormData({ ...formData, nameDisplay: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-crimson-700 focus:outline-none"
                    >
                      <option value="FIRST_NAME_ONLY">First Name Only (e.g. Priyanka G.)</option>
                      <option value="FULL_NAME">Full Name (Priyanka Ghosh)</option>
                      <option value="INITIALS">Initials Only (P. G.)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveProfileData(false)}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-all disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>{isSaving ? 'Saving...' : 'Save Progress'}</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="inline-flex items-center space-x-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving Profile...' : currentStep === totalSteps ? 'Finish & Save Profile' : 'Save & Continue'}</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {saveToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 text-white ${
            saveToast.type === 'success' ? 'bg-emerald-700' : 'bg-red-700'
          }`}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{saveToast.message}</span>
        </div>
      )}

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  )
}
