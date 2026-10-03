import React from 'react'
import { Shield, Lock } from 'lucide-react'
import { getDefaultAvatar } from '../../lib/utils'

interface ProtectedPhotoProps {
  src?: string
  photoUrl?: string
  alt?: string
  altText?: string
  gender?: string | null
  profileId?: string
  isProtected?: boolean
  className?: string
  watermarkText?: string
}

export const ProtectedPhoto: React.FC<ProtectedPhotoProps> = ({
  src,
  photoUrl,
  alt,
  altText,
  gender,
  profileId = 'BK-MEMBER',
  isProtected = false,
  className = '',
  watermarkText,
}) => {
  const imageSource = src || photoUrl || getDefaultAvatar(gender)
  const imageAlt = alt || altText || 'Member Photo'

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const displayWatermark =
    watermarkText || `BorKonya Protected • ${profileId}`

  return (
    <div
      className={`relative overflow-hidden select-none bg-slate-100 flex items-center justify-center ${className}`}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Underlying Image with pointer-events-none to prevent drag & context menu */}
      <img
        src={imageSource}
        alt={imageAlt}
        loading="lazy"
        draggable={false}
        onError={(e) => {
          // If custom photo fails to load, fallback safely to default gender avatar
          const target = e.currentTarget
          const fallback = getDefaultAvatar(gender)
          if (target.src !== fallback) {
            target.src = fallback
          }
        }}
        className={`h-full w-full object-cover transition-transform duration-500 pointer-events-none select-none ${
          isProtected ? 'blur-md scale-105' : ''
        }`}
      />

      {/* Transparent Protective Shield (catches all clicks/taps so raw image cannot be touched) */}
      <div
        className="absolute inset-0 z-10 cursor-default"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
      />

      {/* Dynamic Security Watermark */}
      <div className="photo-watermark-overlay z-20 pointer-events-none">
        <span className="photo-watermark-text select-none">
          {displayWatermark}
        </span>
      </div>

      {/* Protected Blur Overlay */}
      {isProtected && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/40 p-4 text-center backdrop-blur-xs">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-crimson-700/90 text-white shadow-md">
            <Lock className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-white shadow-xs">
            Photo Protected
          </span>
          <span className="text-[10px] text-slate-200 mt-0.5">
            Visible upon accepted interest
          </span>
        </div>
      )}

      {/* Privacy Badge */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center space-x-1 rounded-full bg-navy-950/85 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-crimson-200 pointer-events-none border border-crimson-500/20">
        <Shield className="h-2.5 w-2.5 text-crimson-300" />
        <span>Anti-Save Protected</span>
      </div>
    </div>
  )
}
