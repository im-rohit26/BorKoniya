import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShieldCheck } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-400 text-xs pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Meaning */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
                <Heart className="h-5 w-5 fill-slate-950" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-serif">
                Bor<span className="text-amber-500">Konya</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Bor = Groom • Konya = Bride. A dedicated, dignified matrimonial platform honoring the traditions of the Sadgope, Gowala, and Goala communities.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-amber-400 font-semibold pt-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Trust & Privacy Protected</span>
            </div>
          </div>

          {/* Regional Reach */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Community Hubs
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>West Bengal (Kolkata, Bardhaman, Medinipur)</li>
              <li>Odisha (Bhubaneswar, Cuttack, Balasore)</li>
              <li>Jharkhand (Ranchi, Jamshedpur, Dhanbad)</li>
              <li>Bihar, Chhattisgarh & Maharashtra</li>
              <li>Delhi / NCR & Global NRI Community</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Matrimonial Services
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <Link to="/search" className="hover:text-amber-400 transition-colors">
                  Search Brides & Grooms
                </Link>
              </li>
              <li>
                <Link to="/matches" className="hover:text-amber-400 transition-colors">
                  Recommended Matches
                </Link>
              </li>
              <li>
                <Link to="/subscription" className="hover:text-amber-400 transition-colors">
                  Premium Membership (₹200/mo)
                </Link>
              </li>
              <li>
                <Link to="/success-stories" className="hover:text-amber-400 transition-colors">
                  Community Success Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Trust & Security
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <Link to="/privacy" className="hover:text-amber-400 transition-colors">
                  Privacy Policy & Contact Controls
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-amber-400 transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-amber-400 transition-colors">
                  Matrimonial Safety Guidelines
                </Link>
              </li>
              <li>
                <Link to="/help#contact" className="hover:text-amber-400 transition-colors">
                  Community Helpdesk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} BorKonya Matrimony. Parampara Se Rishton Tak.</p>
          <div className="flex items-center space-x-4">
            <span>Sadgope Community</span>
            <span>•</span>
            <span>Gowala / Goala Community</span>
            <span>•</span>
            <span>Safe & Verified</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
