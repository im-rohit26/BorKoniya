import React, { useState } from 'react'
import { Sparkles, Info, Check, X } from 'lucide-react'

interface MatchScoreBadgeProps {
  score: number
  breakdown?: string[]
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  breakdown = [
    'Age preference matches (21-28 yrs)',
    'Community & sub-caste aligned (Sadgope)',
    'State / Native region compatibility matches',
    'Education qualification matches criteria',
    'Lifestyle & diet alignment',
  ],
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  // Color according to score
  const badgeColor =
    score >= 90
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : score >= 75
      ? 'bg-amber-50 text-amber-800 border-amber-300'
      : 'bg-slate-100 text-slate-700 border-slate-300'

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center space-x-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all hover:shadow-xs active:scale-95 ${badgeColor}`}
      >
        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
        <span>{score}% Match</span>
        <Info className="h-3 w-3 text-slate-400 ml-0.5" />
      </button>

      {/* "Why this match?" Popover */}
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 rounded-2xl bg-slate-900 p-3.5 text-xs text-white shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <span className="font-bold text-amber-400 flex items-center space-x-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Why This Match? ({score}%)</span>
            </span>
            <button
              onClick={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-slate-200">{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
            * Score is calculated by weighted preference matching and does not guarantee compatibility.
          </p>
        </div>
      )}
    </div>
  )
}
