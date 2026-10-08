import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { getDefaultAvatar } from '../../lib/utils'
import { getOptimizedImageUrl } from '../../lib/imageUtils'

interface ProtectedPhotoProps {
  src?: string
  photoUrl?: string
  alt?: string
  altText?: string
  gender?: string | null
  profileId?: string
  isProtected?: boolean
  className?: string
  imgClassName?: string
  objectFit?: 'cover' | 'contain'
  watermarkText?: string
  width?: number
  height?: number
  preset?: 'thumbnail' | 'card' | 'detail' | 'avatar'
}

export const ProtectedPhoto: React.FC<ProtectedPhotoProps> = ({
  src,
  photoUrl,
  alt,
  altText,
  gender,
  isProtected = false,
  className = '',
  imgClassName = '',
  objectFit = 'cover',
  width,
  height,
  preset = 'card',
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Determine preset dimensions
  let targetWidth = width
  let targetHeight = height
  if (!targetWidth && !targetHeight) {
    if (preset === 'thumbnail' || preset === 'avatar') {
      targetWidth = 160
      targetHeight = 160
    } else if (preset === 'card') {
      targetWidth = 450
      targetHeight = 560
    } else if (preset === 'detail') {
      targetWidth = 800
      targetHeight = 1000
    }
  }

  const rawSource = src || photoUrl
  const imageSource = rawSource
    ? getOptimizedImageUrl(rawSource, {
        width: targetWidth,
        height: targetHeight,
        quality: 82,
        resize: 'cover',
      })
    : getDefaultAvatar(gender)

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
      {/* Skeleton loader placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse z-5" />
      )}

      {/* Underlying Image with pointer-events-none to prevent drag & context menu */}
      <img
        src={hasError ? getDefaultAvatar(gender) : imageSource}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setHasError(true)
          setIsLoaded(true)
          const target = e.currentTarget
          const fallback = getDefaultAvatar(gender)
          if (target.src !== fallback) {
            target.src = fallback
          }
        }}
        className={`h-full w-full ${
          objectFit === 'contain' ? 'object-contain' : 'object-cover object-top'
        } transition-opacity duration-300 pointer-events-none select-none ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${isProtected ? 'blur-md scale-105' : ''} ${imgClassName}`}
      />

      {/* Transparent Protective Shield (catches all clicks/taps so raw image cannot be touched) */}
      <div
        className="absolute inset-0 z-10 cursor-default"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
      />

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
    </div>
  )
}
