import React from 'react'
import { Skeleton } from './SkeletonBase'

export const ProfileDetailsSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading profile details"
      className="space-y-8 w-full max-w-5xl mx-auto"
    >
      {/* 1. TOP SUMMARY CARD SKELETON */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xs border border-slate-200/90">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Round Photo Avatar */}
          <div className="flex-shrink-0">
            <Skeleton className="w-28 h-28 sm:w-36 sm:h-36" rounded="full" />
          </div>

          {/* Core Info & Actions */}
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48 sm:w-64 mx-auto md:mx-0" rounded="lg" />
                <Skeleton className="h-4 w-36 sm:w-48 mx-auto md:mx-0" rounded="md" />
              </div>
              <Skeleton className="h-8 w-24 mx-auto md:mx-0" rounded="full" />
            </div>

            {/* Quick Details Chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <Skeleton className="h-7 w-24" rounded="xl" />
              <Skeleton className="h-7 w-28" rounded="xl" />
              <Skeleton className="h-7 w-32" rounded="xl" />
              <Skeleton className="h-7 w-36" rounded="xl" />
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3 border-t border-slate-100">
              <Skeleton className="h-11 w-36" rounded="xl" />
              <Skeleton className="h-11 w-32" rounded="xl" />
              <Skeleton className="h-11 w-11" rounded="xl" />
              <Skeleton className="h-11 w-11" rounded="xl" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOWER DETAIL SECTIONS SKELETON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: About Candidate */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" rounded="md" />
            <Skeleton className="h-5 w-40" rounded="md" />
          </div>
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-3.5 w-full" rounded="sm" />
            <Skeleton className="h-3.5 w-11/12" rounded="sm" />
            <Skeleton className="h-3.5 w-4/5" rounded="sm" />
            <Skeleton className="h-3.5 w-2/3" rounded="sm" />
          </div>
        </div>

        {/* Section 2: Education & Career */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" rounded="md" />
            <Skeleton className="h-5 w-44" rounded="md" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-28" rounded="md" />
              <Skeleton className="h-4 w-36" rounded="md" />
            </div>
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-24" rounded="md" />
              <Skeleton className="h-4 w-40" rounded="md" />
            </div>
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-32" rounded="md" />
              <Skeleton className="h-4 w-28" rounded="md" />
            </div>
          </div>
        </div>

        {/* Section 3: Family Details */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" rounded="md" />
            <Skeleton className="h-5 w-36" rounded="md" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-32" rounded="md" />
              <Skeleton className="h-4 w-36" rounded="md" />
            </div>
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-28" rounded="md" />
              <Skeleton className="h-4 w-44" rounded="md" />
            </div>
          </div>
        </div>

        {/* Section 4: Horoscope & Lifestyle */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" rounded="md" />
            <Skeleton className="h-5 w-48" rounded="md" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-24" rounded="md" />
              <Skeleton className="h-4 w-28" rounded="md" />
            </div>
            <div className="flex justify-between items-center py-1">
              <Skeleton className="h-4 w-20" rounded="md" />
              <Skeleton className="h-4 w-32" rounded="md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
