import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, Menu, X, Sparkles, LogOut, ChevronDown, Trash2, LayoutDashboard, User } from 'lucide-react'
import { languages } from './LanguageSelectorModal'
import { useAuth } from '../../context/AuthContext'
import { getDefaultAvatar } from '../../lib/utils'
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
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { user, isAuthenticated, logout, deleteMyAccount } = useAuth()

  const handleLogout = () => {
    logout()
    setUserDropdownOpen(false)
    setMobileMenuOpen(false)
    navigate('/login')
  }

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true)
    setDeleteError(null)
    try {
      await deleteMyAccount()
      setDeleteAccountModalOpen(false)
      setUserDropdownOpen(false)
      setMobileMenuOpen(false)
      navigate('/login')
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const currentLang = languages.find((l) => i18n.language.startsWith(l.code)) || languages[0]

  const navLinks = [
    { name: t('nav.home', 'Home'), path: '/' },
    { name: t('nav.matches', 'Matches'), path: '/matches' },
    { name: t('nav.search', 'Search'), path: '/search' },
    { name: t('nav.interests', 'Interests'), path: '/interests' },
    { name: t('nav.shortlist', 'Shortlist'), path: '/shortlist' },
    { name: t('nav.messages', 'Messages'), path: '/messages' },
    { name: t('nav.plans', 'Plans'), path: '/subscription' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
          <img
            src={logoImg}
            alt="BorKoniya - Amar Parampara, Amar Saathi"
            className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-102"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-5 lg:space-x-7">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-crimson-700 border-b-2 border-crimson-700 pb-1 font-bold'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Right Action Controls */}
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
                    <LayoutDashboard className="w-4 h-4 text-slate-500" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/profile/edit"
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
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Upgrade Plan</span>
                  </Link>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false)
                      setDeleteAccountModalOpen(true)
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Delete Account Permanently</span>
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

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center space-x-2 flex-shrink-0">
          <button
            onClick={onOpenLanguageModal}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Language selector"
          >
            <Globe className="h-5 w-5 text-crimson-700" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg px-3 py-2 text-base font-semibold transition-colors ${
                  location.pathname === link.path
                    ? 'bg-crimson-50 text-crimson-800'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy-900 truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Member'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.phone_number || user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 flex items-center space-x-2.5"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/profile/edit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 flex items-center space-x-2.5"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/subscription"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 flex items-center space-x-2.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Upgrade Plan</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setDeleteAccountModalOpen(true)
                  }}
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account Permanently</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-crimson-700 hover:bg-crimson-50 flex items-center space-x-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-50"
                >
                  {t('nav.login', 'Login')}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onOpenRegister()
                  }}
                  className="w-full rounded-lg bg-crimson-700 py-2.5 text-sm font-semibold text-white shadow hover:bg-crimson-800"
                >
                  {t('nav.register', 'Register Free')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= DELETE ACCOUNT CONFIRMATION MODAL ================= */}
      {deleteAccountModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b2a5b]/45 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-[#e3e9f5] overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#fde8ee] flex items-center justify-center mx-auto mb-4 text-[#e0102f]">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-[#0b2a5b] text-lg mb-2">
              Delete Account Permanently?
            </h3>

            <p className="text-xs text-[#6b7a99] leading-relaxed mb-4">
              Are you sure you want to permanently delete your account? This action cannot be undone. All your profile information, matches, chats, and subscriptions will be permanently removed.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setDeleteAccountModalOpen(false)
                  setDeleteError(null)
                }}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-full transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#e0102f] hover:bg-[#c70a27] rounded-full transition-colors shadow-md shadow-[#e0102f]/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <span>Deleting...</span>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
