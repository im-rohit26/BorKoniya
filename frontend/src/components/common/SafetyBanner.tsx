import React from 'react'
import { ShieldAlert, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export const SafetyBanner: React.FC = () => {
  return (
    <div className="bg-crimson-800 border-b border-crimson-900 text-white px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs">
        <div className="flex items-center space-x-2 text-white/95 font-medium text-center sm:text-left">
          <ShieldAlert className="h-4 w-4 text-crimson-200 flex-shrink-0 hidden xs:inline" />
          <span>
            <strong className="font-bold text-white">Community Safety Advisory:</strong> Never transfer funds or disclose banking OTPs to anyone. Meet alliances in family settings.
          </span>
        </div>
        <Link
          to="/help#safety"
          className="inline-flex items-center space-x-1 font-semibold text-crimson-100 hover:text-white underline underline-offset-2 flex-shrink-0 transition-colors"
        >
          <span>Safety Guidelines</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
