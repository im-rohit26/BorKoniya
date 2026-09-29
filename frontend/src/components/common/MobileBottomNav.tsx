import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Search, Heart, MessageSquare, Crown } from 'lucide-react'

export const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()

  // Navigation items optimized for matrimonial discovery and engagement
  const navItems = [
    {
      label: t('nav.matches', 'Matches'),
      path: '/matches',
      icon: Users,
      badge: null,
    },
    {
      label: t('nav.search', 'Search'),
      path: '/search',
      icon: Search,
      badge: null,
    },
    {
      label: t('nav.interests', 'Interests'),
      path: '/interests',
      icon: Heart,
      badge: '3',
    },
    {
      label: t('nav.messages', 'Chat'),
      path: '/messages',
      icon: MessageSquare,
      badge: '2',
    },
    {
      label: t('nav.upgrade', 'Upgrade'),
      path: '/subscription',
      icon: Crown,
      badge: '50%',
      isPremium: true,
    },
  ]

  // Hide bottom nav during full-screen onboarding wizard or active message thread
  if (
    location.pathname.startsWith('/profile/create') ||
    location.pathname.startsWith('/profile/edit') ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname.match(/^\/messages\/[a-zA-Z0-9_-]+/)
  ) {
    return null
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/matches' && location.pathname === '/') ||
            (item.path === '/messages' && location.pathname.startsWith('/messages'))

          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-amber-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-amber-50 text-amber-600' : ''
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? 'scale-110' : ''
                    } ${item.isPremium && !isActive ? 'text-amber-500' : ''}`}
                  />
                </div>

                {/* Optional notification or coupon badge */}
                {item.badge && (
                  <span
                    className={`absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-bold rounded-full text-white shadow-xs ${
                      item.isPremium
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 ring-1 ring-white'
                        : 'bg-rose-500 ring-1 ring-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="w-1 h-1 bg-amber-600 rounded-full mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
