import React from 'react'
import { Skeleton } from './SkeletonBase'

interface InterestListSkeletonProps {
  count?: number
}

export const InterestListSkeleton: React.FC<InterestListSkeletonProps> = ({ count = 4 }) => {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div
      role="status"
      aria-label="Loading list"
      className="space-y-4 w-full"
    >
      {items.map((i) => (
        <div
          key={i}
          className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5"
        >
          {/* Avatar placeholder */}
          <div className="flex-shrink-0">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24" rounded="2xl" />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 w-full text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-5 w-40 mx-auto sm:mx-0" rounded="md" />
                <Skeleton className="h-3.5 w-32 mx-auto sm:mx-0" rounded="sm" />
              </div>
              <Skeleton className="h-6 w-24 mx-auto sm:mx-0" rounded="full" />
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <Skeleton className="h-6 w-28" rounded="lg" />
              <Skeleton className="h-6 w-32" rounded="lg" />
              <Skeleton className="h-6 w-24" rounded="lg" />
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
              <Skeleton className="h-10 w-28" rounded="xl" />
              <Skeleton className="h-10 w-24" rounded="xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
