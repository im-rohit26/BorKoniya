import React from 'react'
import { Skeleton } from './SkeletonBase'
import { ProfileGridSkeleton } from './ProfileGridSkeleton'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="space-y-8 w-full"
    >
      {/* 1. WELCOME BANNER SKELETON */}
      <div className="rounded-3xl bg-slate-900/90 p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row w-full md:w-auto">
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0" rounded="full" />
            <div className="space-y-2 w-full md:w-auto">
              <Skeleton className="h-4 w-28 mx-auto md:mx-0 bg-slate-700" rounded="md" />
              <Skeleton className="h-7 w-48 sm:w-64 mx-auto md:mx-0 bg-slate-700" rounded="lg" />
              <Skeleton className="h-3.5 w-40 sm:w-56 mx-auto md:mx-0 bg-slate-700" rounded="md" />
            </div>
          </div>
          {/* Profile completion bar skeleton */}
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28 bg-slate-700" rounded="sm" />
              <Skeleton className="h-3 w-8 bg-slate-700" rounded="sm" />
            </div>
            <Skeleton className="h-2.5 w-full bg-slate-700" rounded="full" />
          </div>
        </div>
      </div>

      {/* 2. METRICS CARDS SKELETON (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10" rounded="xl" />
              <Skeleton className="h-6 w-10" rounded="md" />
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-4 w-24" rounded="md" />
              <Skeleton className="h-3 w-32" rounded="sm" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. RECOMMENDED MATCHES SECTION SKELETON */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <Skeleton className="h-6 w-56" rounded="md" />
          <Skeleton className="h-4 w-28" rounded="md" />
        </div>
        <ProfileGridSkeleton count={6} layout="vertical" columnsClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
      </div>
    </div>
  )
}
