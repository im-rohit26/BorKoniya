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
} from 'lucide-react'
import { getMyProfile, updateMyProfile } from '../lib/authApi'

export const ProfileWizardPage: React.FC = () => {
  const navigate = useNavigate()
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
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
  ])
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0)

  // Calculate dynamic completion percentage
  const calculateCompletion = () => {
    let score = 20
    if (formData.firstName && formData.lastName) score += 15
    if (formData.community && formData.subCommunity) score += 15
    if (formData.highestQualification && formData.occupation) score += 15
    if (formData.fatherOccupation) score += 10
    if (formData.aboutMe && formData.aboutMe.length > 50) score += 15
    if (photos.length > 0) score += 10
    return Math.min(score, 100)
  }

  const completionPct = calculateCompletion()

  const handleAddSamplePhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    ]
    const next = samples[photos.length % samples.length]
    setPhotos([...photos, next])
  }

  const handleDeletePhoto = (index: number) => {
    if (photos.length <= 1) return
    const updated = photos.filter((_, i) => i !== index)
    setPhotos(updated)
    if (primaryPhotoIndex >= updated.length) {
      setPrimaryPhotoIndex(0)
    }
  }

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        if (p) {
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
            aboutMe: p.about_me || prev.aboutMe,
          }))
        }
      })
      .catch(() => {})
  }, [])

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setIsSaving(true)
      try {
        await updateMyProfile({
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: formData.dob,
          height_cm: parseInt(formData.heightCm) || 165,
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
          about_me: formData.aboutMe,
        })
      } catch (e) {
        console.error('Failed to save profile updates:', e)
      } finally {
        setIsSaving(false)
        navigate('/dashboard')
      }
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
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                </span>
              </span>
              <h1 className="text-2xl font-black text-slate-900 font-serif mt-0.5">
                Complete Your Matrimonial Profile
              </h1>
            </div>

            <div className="sm:text-right">
              <div className="text-xs font-bold text-slate-600">
                Profile Completion:{' '}
                <span className="text-amber-600 text-sm font-black">{completionPct}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Profiles above 80% receive 4x more interests
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-500 transition-all duration-300"
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
                  onClick={() => setCurrentStep(idx + 1)}
                  className={`cursor-pointer py-1.5 px-1 rounded-lg transition-all truncate ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800'
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
                  <User className="h-5 w-5 text-amber-600" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Height (cm) *
                  </label>
                  <select
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="152">5'0" (152 cm)</option>
                    <option value="155">5'1" (155 cm)</option>
                    <option value="157">5'2" (157 cm)</option>
                    <option value="160">5'3" (160 cm)</option>
                    <option value="163">5'4" (163 cm)</option>
                    <option value="165">5'5" (165 cm)</option>
                    <option value="168">5'6" (168 cm)</option>
                    <option value="170">5'7" (170 cm)</option>
                    <option value="173">5'8" (173 cm)</option>
                    <option value="175">5'9" (175 cm)</option>
                    <option value="178">5'10" (178 cm)</option>
                    <option value="180">5'11" (180 cm)</option>
                    <option value="183">6'0" (183 cm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marital Status *
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="NEVER_MARRIED">Never Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="AWAITING_DIVORCE">Awaiting Divorce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mother Tongue *
                  </label>
                  <select
                    value={formData.motherTongue}
                    onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Bengali">Bengali</option>
                    <option value="Odia">Odia</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
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
                  <Users className="h-5 w-5 text-amber-600" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Sadgope">Sadgope</option>
                    <option value="Gowala / Goala">Gowala / Goala</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sub-Community *
                  </label>
                  <select
                    value={formData.subCommunity}
                    onChange={(e) => setFormData({ ...formData, subCommunity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    {formData.community === 'Sadgope' ? (
                      <>
                        <option value="Kulin Sadgope">Kulin Sadgope</option>
                        <option value="Ghosh">Ghosh</option>
                        <option value="Pal">Pal</option>
                        <option value="Sarkar">Sarkar</option>
                        <option value="Mollik">Mollik</option>
                        <option value="Other Sadgope">Other Sadgope</option>
                      </>
                    ) : (
                      <>
                        <option value="Ahir">Ahir</option>
                        <option value="Gope">Gope</option>
                        <option value="Gowala General">Gowala General</option>
                      </>
                    )}
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Living State *
                  </label>
                  <select
                    value={formData.currentState}
                    onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="West Bengal">West Bengal</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Delhi / NCR">Delhi / NCR</option>
                    <option value="Other">Other / NRI</option>
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                  <GraduationCap className="h-5 w-5 text-amber-600" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="M.Tech in Computer Science">M.Tech / M.E</option>
                    <option value="B.Tech / B.E">B.Tech / B.E</option>
                    <option value="MBA / PGDM">MBA / PGDM</option>
                    <option value="Doctor / MBBS / MD">Doctor / MBBS / MD</option>
                    <option value="Chartered Accountant (CA)">Chartered Accountant (CA)</option>
                    <option value="Master’s Degree (MA/M.Sc/M.Com)">
                      Master’s Degree (MA/M.Sc/M.Com)
                    </option>
                    <option value="Bachelor’s Degree (BA/B.Sc/B.Com)">
                      Bachelor’s Degree (BA/B.Sc/B.Com)
                    </option>
                    <option value="Civil Services / Law / Other">Civil Services / Law / Other</option>
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Income Range *
                  </label>
                  <select
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="₹3 – 5 Lakhs">₹3 – 5 Lakhs</option>
                    <option value="₹5 – 10 Lakhs">₹5 – 10 Lakhs</option>
                    <option value="₹10 – 15 Lakhs">₹10 – 15 Lakhs</option>
                    <option value="₹15 – 25 Lakhs">₹15 – 25 Lakhs</option>
                    <option value="₹25 – 50 Lakhs">₹25 – 50 Lakhs</option>
                    <option value="₹50 Lakhs+">₹50 Lakhs+</option>
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                  <Users className="h-5 w-5 text-amber-600" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Family Type
                  </label>
                  <select
                    value={formData.familyType}
                    onChange={(e) => setFormData({ ...formData, familyType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                  <Heart className="h-5 w-5 text-amber-600" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                    <option value="VEGETARIAN">Vegetarian</option>
                    <option value="EGGETARIAN">Eggetarian</option>
                    <option value="JAIN">Jain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Smoking</label>
                  <select
                    value={formData.smoking}
                    onChange={(e) => setFormData({ ...formData, smoking: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                <div className="rounded-xl bg-amber-50/70 p-3 mb-2.5 border border-amber-200/80 text-xs text-amber-950 space-y-1">
                  <span className="font-bold flex items-center space-x-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700" />
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
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs leading-relaxed text-slate-800 focus:border-amber-500 focus:outline-none"
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
                    <Moon className="h-5 w-5 text-amber-600" />
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
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rashi</label>
                    <select
                      value={formData.rashi}
                      onChange={(e) => setFormData({ ...formData, rashi: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                  <Camera className="h-5 w-5 text-amber-600" />
                  <span>7. Profile Photos & Privacy Protection Shield</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload photos with automatic anti-download watermark protection and configure who can see your contact info.
                </p>
              </div>

              {/* Photo Upload & Gallery */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">
                    Uploaded Photos ({photos.length} / 5)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Camera className="h-3.5 w-3.5 text-amber-600" />
                    <span>Upload New Photo</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {photos.map((url, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-2xl overflow-hidden border-2 bg-slate-100 h-40 ${
                        primaryPhotoIndex === idx
                          ? 'border-amber-500 ring-2 ring-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Protected Photo Component with Watermark and Anti-Save Shield */}
                      <ProtectedPhoto
                        src={url}
                        alt="Profile photo"
                        profileId="BK-9941"
                        className="h-full w-full"
                      />

                      {/* Primary Badge */}
                      {primaryPhotoIndex === idx && (
                        <div className="absolute top-2 left-2 z-30 rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase shadow-xs">
                          Primary
                        </div>
                      )}

                      {/* Controls on hover */}
                      <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between gap-1">
                        {primaryPhotoIndex !== idx && (
                          <button
                            type="button"
                            onClick={() => setPrimaryPhotoIndex(idx)}
                            className="rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-900"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(idx)}
                          className="rounded-lg bg-rose-600/90 p-1 text-white hover:bg-rose-700 ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Download Shield Notice */}
              <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200 flex items-start space-x-3 text-xs text-amber-950">
                <ShieldCheck className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold">Anti-Download & Screenshot Shield Active</h4>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
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
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
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

            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving Profile...' : currentStep === totalSteps ? 'Finish & Save Profile' : 'Save & Continue'}</span>
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  )
}
