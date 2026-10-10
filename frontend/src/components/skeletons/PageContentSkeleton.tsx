import React from 'react'
import { Skeleton } from './SkeletonBase'

export const PageContentSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="min-h-[70vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 animate-in fade-in duration-200"
    >
      {/* Page Header placeholder */}
      <div className="space-y-3 pb-6 border-b border-slate-200">
        <Skeleton className="h-4 w-36" rounded="md" />
        <Skeleton className="h-8 w-64 sm:w-80" rounded="lg" />
        <Skeleton className="h-4 w-96 max-w-full" rounded="md" />
      </div>

      {/* Content Layout placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-48 w-full" rounded="2xl" />
          <Skeleton className="h-32 w-full" rounded="2xl" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full" rounded="2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full" rounded="2xl" />
            <Skeleton className="h-40 w-full" rounded="2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
