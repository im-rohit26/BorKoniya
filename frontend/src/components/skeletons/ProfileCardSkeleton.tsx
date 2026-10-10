import React from 'react'
import { Skeleton } from './SkeletonBase'

interface ProfileCardSkeletonProps {
  layout?: 'vertical' | 'horizontal'
}

export const ProfileCardSkeleton: React.FC<ProfileCardSkeletonProps> = ({
  layout = 'vertical',
}) => {
  if (layout === 'horizontal') {
    return (
      <div
        role="status"
        aria-label="Loading profile"
        className="relative flex flex-col sm:flex-row overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-xs p-4 sm:p-5 gap-4 sm:gap-6"
      >
        {/* Left Photo Placeholder */}
        <div className="w-full sm:w-44 md:w-52 aspect-[3/4] sm:h-auto rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
          <Skeleton className="w-full h-full" rounded="2xl" />
        </div>

        {/* Right Info Section */}
        <div className="flex flex-col flex-1 justify-between gap-4 py-1">
          <div className="space-y-3">
            {/* Header: Name & Match Score */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-44 sm:w-56" rounded="lg" />
                <Skeleton className="h-4 w-32" rounded="md" />
              </div>
              <Skeleton className="h-7 w-20" rounded="full" />
            </div>

            {/* Quick Details Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-4 w-36" rounded="md" />
              <Skeleton className="h-4 w-40" rounded="md" />
              <Skeleton className="h-4 w-32" rounded="md" />
              <Skeleton className="h-4 w-44" rounded="md" />
            </div>

            {/* Short Bio placeholder */}
            <div className="pt-2 space-y-1.5">
              <Skeleton className="h-3.5 w-full" rounded="sm" />
              <Skeleton className="h-3.5 w-4/5" rounded="sm" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-11 flex-1 sm:flex-initial sm:w-36" rounded="xl" />
            <Skeleton className="h-11 w-11" rounded="xl" />
            <Skeleton className="h-11 w-11" rounded="xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="relative flex flex-col h-full overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-xs"
    >
      {/* Top Photo Placeholder */}
      <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full max-h-[380px] flex-shrink-0 bg-slate-100 overflow-hidden">
        <Skeleton className="w-full h-full" rounded="none" />
        {/* Match badge placeholder */}
        <div className="absolute top-3 right-3">
          <Skeleton className="h-7 w-16" rounded="full" />
        </div>
        {/* Verification badge placeholder */}
        <div className="absolute top-3 left-3">
          <Skeleton className="h-6 w-20" rounded="full" />
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3 sm:gap-4 bg-white">
        <div className="space-y-3">
          {/* Name & Age */}
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" rounded="lg" />
            <Skeleton className="h-4 w-28" rounded="md" />
          </div>

          {/* Key Attributes */}
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-48" rounded="md" />
            <Skeleton className="h-4 w-44" rounded="md" />
            <Skeleton className="h-4 w-36" rounded="md" />
          </div>

          {/* Bio Snippet */}
          <div className="pt-2 space-y-1.5">
            <Skeleton className="h-3 w-full" rounded="sm" />
            <Skeleton className="h-3 w-3/4" rounded="sm" />
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Skeleton className="h-11 flex-1" rounded="xl" />
          <Skeleton className="h-11 w-11 flex-shrink-0" rounded="xl" />
          <Skeleton className="h-11 w-11 flex-shrink-0" rounded="xl" />
        </div>
      </div>
    </div>
  )
}
