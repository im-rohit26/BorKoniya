import React from 'react'
import { ProfileCardSkeleton } from './ProfileCardSkeleton'

interface ProfileGridSkeletonProps {
  count?: number
  layout?: 'vertical' | 'horizontal'
  columnsClassName?: string
}

export const ProfileGridSkeleton: React.FC<ProfileGridSkeletonProps> = ({
  count = 6,
  layout = 'vertical',
  columnsClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
}) => {
  const items = Array.from({ length: count }, (_, i) => i)

  if (layout === 'horizontal') {
    return (
      <div className="space-y-4 w-full" role="status" aria-label="Loading profiles">
        {items.map((key) => (
          <ProfileCardSkeleton key={key} layout="horizontal" />
        ))}
      </div>
    )
  }

  return (
    <div className={columnsClassName} role="status" aria-label="Loading profiles">
      {items.map((key) => (
        <ProfileCardSkeleton key={key} layout="vertical" />
      ))}
    </div>
  )
}
