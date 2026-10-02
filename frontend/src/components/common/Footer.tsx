import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import logoImg from '../../assets/logo.jpeg'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-navy-900 bg-navy-950 text-slate-300 text-xs pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand & Meaning */}
          <div className="space-y-3 sm:col-span-2 md:col-span-1">
            <Link to="/" className="inline-block bg-white px-3 py-1.5 rounded-xl shadow-md hover:opacity-95 transition-opacity">
              <img
                src={logoImg}
                alt="BorKoniya - Amar Parampara, Amar Saathi"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              Bor = Groom • Konya = Bride. A dedicated, dignified matrimonial platform honoring the traditions of the Sadgope, Gowala, and Goala communities.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-crimson-300 font-semibold pt-1">
              <ShieldCheck className="h-4 w-4 text-crimson-400" />
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
                <Link to="/search" className="hover:text-crimson-300 transition-colors">
                  Search Brides & Grooms
                </Link>
              </li>
              <li>
                <Link to="/matches" className="hover:text-crimson-300 transition-colors">
                  Recommended Matches
                </Link>
              </li>
              <li>
                <Link to="/subscription" className="hover:text-crimson-300 transition-colors">
                  Premium Membership (₹200/mo)
                </Link>
              </li>
              <li>
                <Link to="/success-stories" className="hover:text-crimson-300 transition-colors">
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
                <Link to="/privacy" className="hover:text-crimson-300 transition-colors">
                  Privacy Policy & Contact Controls
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-crimson-300 transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-crimson-300 transition-colors">
                  Matrimonial Safety Guidelines
                </Link>
              </li>
              <li>
                <Link to="/help#contact" className="hover:text-crimson-300 transition-colors">
                  Community Helpdesk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-navy-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 text-center sm:text-left">
          <p>© {new Date().getFullYear()} BorKonya Matrimony. Parampara Se Rishton Tak.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <span>Sadgope Community</span>
            <span>•</span>
            <span>Gowala / Goala Community</span>
            <span>•</span>
            <span>Safe & Verified</span>
          </div>
        </div>
      </div>

      {/* Signature Crimson Ribbon from reference image */}
      <div className="bg-crimson-900 text-white py-2.5 px-4 text-center text-xs font-semibold tracking-wider flex items-center justify-center gap-2 border-t border-crimson-950">
        <span className="opacity-70">❖</span>
        <span>Together We Build Stronger Families</span>
        <span className="opacity-70">❖</span>
      </div>
    </footer>
  )
}
