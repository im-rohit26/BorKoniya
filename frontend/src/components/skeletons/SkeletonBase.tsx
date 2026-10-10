import React from 'react'
import { clsx } from 'clsx'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  shimmer?: boolean
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
}

/**
 * Base atomic Skeleton block matching BorKonya design system.
 * Uses lightweight CSS shimmer/pulse with prefers-reduced-motion support.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  rounded = 'xl',
  shimmer = true,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'bg-slate-200/80 dark:bg-slate-800/60',
        shimmer && 'animate-pulse motion-reduce:animate-none',
        roundedMap[rounded],
        className
      )}
      {...props}
    />
  )
}
