import React from 'react'
import { ShieldAlert, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export const SafetyBanner: React.FC = () => {
  return (
    <div className="bg-amber-50/90 border-y border-amber-200/80 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-amber-950 font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-700 flex-shrink-0" />
          <span>
            <strong className="font-bold text-amber-900">Community Safety Advisory:</strong> Never transfer funds or disclose banking OTPs to anyone. Meet first alliances in public family settings.
          </span>
        </div>
        <Link
          to="/help#safety"
          className="inline-flex items-center space-x-1 font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 flex-shrink-0"
        >
          <span>Safety Guidelines</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
