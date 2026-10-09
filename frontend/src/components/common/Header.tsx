import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Globe,
  Menu,
  X,
  Sparkles,
  LogOut,
  ChevronDown,
  ChevronRight,
  Settings,
  LayoutGrid,
  User,
  Heart,
  MessageSquare,
  MessageSquareMore,
  Calendar,
  Home,
  Search,
  Phone,
  Pencil,
  Loader2,
} from 'lucide-react'
import { languages } from './LanguageSelectorModal'
import { useAuth } from '../../context/AuthContext'
import { useNotificationBadges } from '../../hooks/useNotificationBadges'
import { AccountSettingsModal } from './AccountSettingsModal'
import { getDefaultAvatar } from '../../lib/utils'
import { uploadProfilePhoto } from '../../lib/profileApi'
import logoImg from '../../assets/logo.jpeg'

interface HeaderProps {
  onOpenLanguageModal: () => void
  onOpenRegister: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenLanguageModal, onOpenRegister }) => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const { user, isAuthenticated, logout, refreshUser } = useAuth()
  const { unreadMessagesCount, pendingInterestsCount } = useNotificationBadges()

  const [isUploadingMobilePhoto, setIsUploadingMobilePhoto] = useState(false)
  const mobileFileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleMobilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB.')
      return
    }
    setIsUploadingMobilePhoto(true)
    try {
      await uploadProfilePhoto(file, true, user?.profile_id || undefined)
      await refreshUser()
    } catch (err: any) {
      console.error('Mobile DP upload failed:', err)
      alert(err.message || 'Failed to update photo. Please try again.')
    } finally {
      setIsUploadingMobilePhoto(false)
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = ''
    }
  }

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setUserDropdownOpen(false)
    setMobileMenuOpen(false)
    navigate('/login')
  }

  const currentLang = languages.find((l) => i18n.language.startsWith(l.code)) || languages[0]

  const desktopNavLinks = [
    { name: t('nav.home', 'Home'), path: '/' },
    { name: t('nav.matches', 'Matches'), path: '/matches' },
    { name: t('nav.search', 'Search'), path: '/search' },
    {
      name: t('nav.interests', 'Interests'),
      path: '/interests',
      badge: pendingInterestsCount > 0 ? (pendingInterestsCount > 99 ? '99+' : String(pendingInterestsCount)) : null,
    },
    { name: t('nav.shortlist', 'Shortlist'), path: '/shortlist' },
    {
      name: t('nav.messages', 'Messages'),
      path: '/messages',
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)) : null,
    },
    { name: t('nav.plans', 'Plans'), path: '/subscription' },
  ]

  // Mobile menu items matching exact design reference
  const mobileMenuItems = [
    {
      name: t('nav.dashboard', 'Dashboard'),
      path: '/dashboard',
      icon: LayoutGrid,
      iconColor: 'text-slate-800',
    },
    {
      name: t('nav.myProfile', 'My Profile'),
      path: '/myprofile',
      icon: User,
      iconColor: 'text-slate-800',
    },
     {
      name: t('nav.home', 'Home'),
      path: '/',
      icon: Home,
      iconColor: 'text-slate-800',
    },
    {
      name: t('nav.upgradePlan', 'Upgrade Plan'),
      path: '/subscription',
      icon: Sparkles,
      iconColor: 'text-crimson-700',
    },
    {
      name: t('nav.accountSettings', 'Account Settings'),
      path: '#settings',
      icon: Settings,
      iconColor: 'text-slate-800',
      isAction: true,
      action: () => {
        setMobileMenuOpen(false)
        setSettingsModalOpen(true)
      },
    },
    {
      name: t('nav.interests', 'Interests'),
      path: '/interests',
      icon: Heart,
      iconColor: 'text-slate-800',
      badge: pendingInterestsCount > 0 ? (pendingInterestsCount > 99 ? '99+' : String(pendingInterestsCount)) : null,
    },
    {
      name: t('nav.shortlist', 'Shortlist'),
      path: '/shortlist',
      icon: MessageSquareMore,
      iconColor: 'text-slate-800',
    },
    {
      name: t('nav.messages', 'Messages'),
      path: '/messages',
      icon: MessageSquare,
      iconColor: 'text-slate-800',
      badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)) : null,
    },
    {
      name: t('nav.plans', 'Plans'),
      path: '/subscription',
      icon: Calendar,
      iconColor: 'text-slate-800',
    },
    {
      isDivider: true,
    },
   
    {
      name: t('nav.search', 'Search'),
      path: '/search',
      icon: Search,
      iconColor: 'text-slate-800',
    },
  ]

  const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Dhurjoti Ghosh'
  const displayPhone = user?.phone_number || (isAuthenticated ? '+91 8457845555' : '')

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <img
              src={logoImg}
              alt="BorKoniya"
              className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-5 lg:space-x-7">
            {desktopNavLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'text-crimson-700 border-b-2 border-crimson-700 pb-1 font-bold'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full text-white bg-crimson-700 leading-tight">
                      {link.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Desktop Right Action Controls */}
          <div className="hidden lg:flex items-center space-x-3.5 flex-shrink-0">
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center space-x-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title="Change Language"
            >
              <Globe className="h-4 w-4 text-crimson-700" />
              <span>{currentLang.native}</span>
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 py-1.5 px-3 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs flex-shrink-0">
                    <img
                      src={user?.photo_url || getDefaultAvatar(user?.gender)}
                      alt={user?.first_name || 'Member'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        const fallback = getDefaultAvatar(user?.gender)
                        if (target.src !== fallback) target.src = fallback
                      }}
                    />
                  </div>
                  <div className="max-w-[120px] truncate">
                    <div className="text-xs font-bold text-navy-900 truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Member'}
                    </div>
                    <div className="text-[10px] text-crimson-700 font-semibold uppercase tracking-wider">
                      {user?.role || 'Member'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 text-sm z-50 transition-all duration-150 animate-in fade-in zoom-in-95"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-navy-900 font-medium transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-500" />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      to="/myprofile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-navy-900 font-medium transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/subscription"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-navy-900 font-medium transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-crimson-700" />
                      <span>Upgrade Plan</span>
                    </Link>

                    <div className="my-1.5 border-t border-slate-100" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false)
                        setSettingsModalOpen(true)
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-navy-900 font-medium transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>Account Settings</span>
                    </button>

                    <div className="my-1.5 border-t border-slate-100" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-crimson-700 hover:bg-crimson-50 font-medium transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-navy-900 hover:text-crimson-700 px-3 py-2 transition-colors"
                >
                  {t('nav.login', 'Login')}
                </Link>

                <button
                  onClick={onOpenRegister}
                  className="flex items-center space-x-1.5 rounded-xl bg-crimson-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-crimson-800 hover:shadow-md transition-all active:scale-95"
                >
                  <Sparkles className="h-4 w-4 text-crimson-200" />
                  <span>{t('nav.register', 'Register Free')}</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center space-x-2 flex-shrink-0">
            <button
              onClick={onOpenLanguageModal}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Language selector"
            >
              <Globe className="h-5 w-5 text-crimson-700" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= FULL SCREEN MOBILE MENU DRAWER ================= */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
          {/* Top Bar of Drawer: Logo + Language Selector + Close Button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
              <img
                src={logoImg}
                alt="BorKoniya"
                className="h-9 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center space-x-3">
              {/* Language Pill Selector */}
              <button
                onClick={onOpenLanguageModal}
                className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-slate-50/70 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
              >
                <Globe className="h-4 w-4 text-crimson-700" />
                <span>{currentLang.label || currentLang.native || 'English'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* User Profile Gradient Card matching 2 Logo Brand Colors */}
            <div
              className="relative overflow-hidden px-5 py-5 text-white"
              style={{
                background: 'linear-gradient(135deg, #c40d0f 0%, #a80a0c 35%, #003572 80%, #00224d 100%)',
              }}
            >
              {/* Subtle background glow effect */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-radial from-navy-300/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none blur-xl" />

              <div className="relative z-10 flex items-center gap-4">
                {/* Profile Photo Avatar with Edit Icon */}
                <div className="relative w-18 h-18 rounded-full border-2 border-white ring-2 ring-white/20 shadow-md flex-shrink-0 bg-white/10 group">
                  <img
                    src={user?.photo_url || getDefaultAvatar(user?.gender)}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget
                      const fallback = getDefaultAvatar(user?.gender)
                      if (target.src !== fallback) target.src = fallback
                    }}
                  />

                  {isAuthenticated && (
                    <>
                      <button
                        type="button"
                        onClick={() => mobileFileInputRef.current?.click()}
                        disabled={isUploadingMobilePhoto}
                        aria-label="Change Profile Photo"
                        title="Change Profile Photo"
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-crimson-700 hover:bg-crimson-800 text-white shadow-md border-2 border-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        {isUploadingMobilePhoto ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Pencil className="w-3 h-3" />
                        )}
                      </button>
                      <input
                        ref={mobileFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMobilePhotoUpload}
                      />
                    </>
                  )}
                </div>

                {/* Profile Info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
                    {isAuthenticated ? displayName : t('nav.welcomeGuest', 'Welcome to BorKoniya')}
                  </h2>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-white bg-crimson-700/80 shadow-2xs border border-white/20">
                      {isAuthenticated ? (user?.role || 'MEMBER') : 'GUEST'}
                    </span>
                  </div>
                  {displayPhone ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/90 font-medium truncate">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-white/90" />
                      <span className="truncate">{displayPhone}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Menu List Items */}
            <div className="px-4 py-3 space-y-1">
              {mobileMenuItems.map((item, index) => {
                if (item.isDivider) {
                  return <div key={`div-${index}`} className="my-2 border-t border-slate-100" />
                }

                const isActive = !item.isAction && location.pathname === item.path
                const IconComponent = item.icon!

                if (item.isAction) {
                  return (
                    <button
                      key={item.name}
                      onClick={item.action}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-colors hover:bg-slate-50 text-left min-h-[48px]"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <IconComponent className="h-5 w-5 text-slate-800 flex-shrink-0" />
                        <span className="text-[15px] font-medium text-slate-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    to={item.path!}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition-colors min-h-[48px] ${
                      isActive
                        ? 'bg-[#FFF1F2] text-crimson-700'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <IconComponent
                        className={`h-5 w-5 flex-shrink-0 ${
                          isActive ? 'text-crimson-700' : item.iconColor || 'text-slate-800'
                        }`}
                      />
                      <span
                        className={`text-[15px] truncate ${
                          isActive ? 'font-bold text-crimson-700' : 'font-medium text-slate-800'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white bg-crimson-700">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 ${
                          isActive ? 'text-crimson-700' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </Link>
                )
              })}

              {/* Bottom Logout Button / Auth Action */}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full mt-3 mb-6 rounded-2xl bg-[#FFF1F2] hover:bg-[#ffe4e6] px-4 py-3.5 flex items-center justify-between text-crimson-700 transition-colors text-left active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <LogOut className="h-5 w-5 text-crimson-700 flex-shrink-0" />
                    <span className="font-bold text-[15px] text-crimson-700">
                      {t('nav.logout', 'Logout')}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-crimson-700 flex-shrink-0" />
                </button>
              ) : (
                <div className="mt-4 mb-6 space-y-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onOpenRegister()
                    }}
                    className="w-full rounded-2xl bg-crimson-700 hover:bg-crimson-800 text-white font-bold py-3.5 px-4 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <Sparkles className="h-4 w-4 text-crimson-200" />
                    <span>{t('nav.register', 'Register Free')}</span>
                  </button>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-navy-900 font-bold py-3 px-4 flex items-center justify-center transition-colors"
                  >
                    <span>{t('nav.login', 'Login')}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ACCOUNT SETTINGS MODAL ================= */}
      <AccountSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  )
}

