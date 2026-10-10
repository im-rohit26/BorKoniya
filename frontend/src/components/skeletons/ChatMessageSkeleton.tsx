import React from 'react'
import { Skeleton } from './SkeletonBase'

interface ChatMessageSkeletonProps {
  count?: number
}

export const ChatMessageSkeleton: React.FC<ChatMessageSkeletonProps> = ({
  count = 6,
}) => {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div
      role="status"
      aria-label="Loading chat messages"
      className="space-y-4 p-4 sm:p-6 w-full flex-1 overflow-hidden"
    >
      {items.map((i) => {
        const isMine = i % 2 !== 0
        const widths = ['w-48', 'w-64', 'w-56', 'w-72', 'w-40', 'w-60']
        const widthClass = widths[i % widths.length]

        return (
          <div
            key={i}
            className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            {!isMine && <Skeleton className="w-7 h-7 flex-shrink-0" rounded="full" />}
            <div
              className={`space-y-1.5 p-3.5 rounded-2xl ${
                isMine
                  ? 'bg-blue-100/70 rounded-br-xs'
                  : 'bg-white rounded-bl-xs border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Skeleton className={`h-4 ${widthClass}`} rounded="md" />
              {i % 3 === 0 && <Skeleton className="h-4 w-32" rounded="md" />}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} pt-1`}>
                <Skeleton className="h-2.5 w-10" rounded="sm" />
              </div>
            </div>
            {isMine && <Skeleton className="w-7 h-7 flex-shrink-0" rounded="full" />}
          </div>
        )
      })}
    </div>
  )
}
