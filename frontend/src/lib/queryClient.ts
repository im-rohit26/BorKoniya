import { QueryClient } from '@tanstack/react-query'

/**
 * Centrally configured TanStack Query Client for BorKonya.
 * 
 * Freshness & caching strategy:
 * - Master data: 60 minutes (rarely changes)
 * - Subscription status: 5 minutes
 * - Interaction status IDs: 45 seconds (or updated via events / mutations)
 * - Dashboard metrics: 60 seconds
 * - Profile discovery / matches: 60 seconds
 * - Window focus refetching disabled to prevent jarring flashes
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
      gcTime: 10 * 60 * 1000, // 10 minutes cache persistence
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

/**
 * Standardized typed query keys.
 * Includes user context where appropriate to ensure strict session isolation.
 */
export const queryKeys = {
  masterData: {
    all: ['master-data'] as const,
    communities: () => ['master-data', 'communities'] as const,
    states: () => ['master-data', 'states'] as const,
    maritalStatuses: () => ['master-data', 'marital-statuses'] as const,
    dietOptions: () => ['master-data', 'diet-options'] as const,
    allMerged: () => ['master-data', 'all-bundle'] as const,
  },
  interactions: {
    all: ['interactions'] as const,
    ids: (userId?: string) => ['interactions', 'ids', userId || 'anon'] as const,
    summary: (userId?: string) => ['interactions', 'summary', userId || 'anon'] as const,
    shortlist: (userId?: string) => ['interactions', 'shortlist', userId || 'anon'] as const,
    received: (status?: string, userId?: string) => ['interactions', 'received', status || 'ALL', userId || 'anon'] as const,
    sent: (status?: string, userId?: string) => ['interactions', 'sent', status || 'ALL', userId || 'anon'] as const,
  },
  subscription: {
    status: (userId?: string) => ['subscription', 'status', userId || 'anon'] as const,
  },
  dashboard: {
    stats: (userId?: string) => ['dashboard', 'stats', userId || 'anon'] as const,
  },
  matches: {
    all: ['matches'] as const,
    recommended: (limit: number, userId?: string) =>
      ['matches', 'recommended', limit, userId || 'anon'] as const,
    tab: (tab: string, filters: Record<string, any>, page: number, userId?: string) =>
      ['matches', tab, filters, page, userId || 'anon'] as const,
  },
  search: {
    results: (filters: Record<string, any>, page: number, userId?: string) =>
      ['search', filters, page, userId || 'anon'] as const,
  },
  profiles: {
    detail: (id: string) => ['profiles', 'detail', id] as const,
    me: (userId?: string) => ['profiles', 'me', userId || 'anon'] as const,
  },
  conversations: {
    list: (userId?: string) => ['conversations', 'list', userId || 'anon'] as const,
    messages: (convId: string) => ['conversations', 'messages', convId] as const,
  },
}

/**
 * Clears private cache on logout or user session switch.
 */
export function clearUserCache() {
  queryClient.removeQueries({
    predicate: (query) => {
      const topKey = query.queryKey[0]
      // Preserve public master data, clear everything else
      return topKey !== 'master-data'
    },
  })
}

/**
 * Targeted cache invalidation helpers.
 */
export function invalidateInteractionCache() {
  queryClient.invalidateQueries({ queryKey: queryKeys.interactions.all })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function invalidateConversationCache() {
  queryClient.invalidateQueries({ queryKey: ['conversations'] })
  queryClient.invalidateQueries({ queryKey: ['interactions', 'summary'] })
}
