import React from 'react'
import { Skeleton } from './SkeletonBase'

interface ConversationListSkeletonProps {
  count?: number
}

export const ConversationListSkeleton: React.FC<ConversationListSkeletonProps> = ({
  count = 6,
}) => {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div
      role="status"
      aria-label="Loading conversations"
      className="space-y-1 p-2 w-full"
    >
      {items.map((i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/60 border border-slate-100"
        >
          {/* Round Avatar with online badge position */}
          <div className="relative flex-shrink-0">
            <Skeleton className="w-12 h-12" rounded="full" />
          </div>

          {/* Name & Last Message */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" rounded="md" />
              <Skeleton className="h-3 w-12" rounded="sm" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-36" rounded="sm" />
              <Skeleton className="h-4 w-4" rounded="full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
