import React from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Search, Home } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onOpenLanguageModal={() => {}} onOpenRegister={() => {}} />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 text-amber-600 mb-6 shadow-sm">
            <span className="text-3xl font-black font-serif">404</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            The page you are looking for doesn't exist or may have been moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link
              to="/matches"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Search className="w-4 h-4 text-amber-600" />
              <span>Browse Matches</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
