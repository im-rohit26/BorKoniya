import { useQuery } from '@tanstack/react-query'
import { masterDataApi, type Community, type SelectOption } from '../lib/masterDataApi'
import {
  getShortlistedIds,
  getSentInterestIds,
  getConnectedProfileIds,
} from '../lib/interactionApi'
import { getSubscriptionStatus, type SubscriptionStatus } from '../lib/subscriptionApi'
import { queryKeys } from '../lib/queryClient'
import { useAuth } from '../context/AuthContext'

export interface MasterDataBundle {
  communities: Community[]
  states: SelectOption[]
  maritalStatuses: SelectOption[]
  dietOptions: SelectOption[]
  isLoading: boolean
}

/**
 * Shared cached hook for Master Data (communities, states, marital statuses, diets).
 * Stale time: 60 minutes.
 */
export function useMasterData(): MasterDataBundle {
  const query = useQuery({
    queryKey: queryKeys.masterData.allMerged(),
    queryFn: async () => {
      const [comm, st, mar, diet] = await Promise.all([
        masterDataApi.getCommunities().catch(() => []),
        masterDataApi.getStates().catch(() => []),
        masterDataApi.getMaritalStatuses().catch(() => []),
        masterDataApi.getDietOptions().catch(() => []),
      ])
      return {
        communities: comm,
        states: st,
        maritalStatuses: mar,
        dietOptions: diet,
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000,
  })

  return {
    communities: query.data?.communities || [],
    states: query.data?.states || [],
    maritalStatuses: query.data?.maritalStatuses || [],
    dietOptions: query.data?.dietOptions || [],
    isLoading: query.isLoading,
  }
}

export interface InteractionStatusBundle {
  shortlistedSet: Set<string>
  sentInterestSet: Set<string>
  connectedSet: Set<string>
  shortlistedIds: string[]
  sentInterestIds: string[]
  connectedIds: string[]
  isLoading: boolean
  refetch: () => Promise<any>
}

/**
 * Shared cached hook for Interaction Status IDs (shortlisted, sent interest, connected).
 * Deduplicates calls across all pages. Stale time: 45 seconds.
 */
export function useInteractionStatus(): InteractionStatusBundle {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.user_id

  const query = useQuery({
    queryKey: queryKeys.interactions.ids(userId),
    queryFn: async () => {
      if (!isAuthenticated) {
        return {
          shortlistedIds: [] as string[],
          sentInterestIds: [] as string[],
          connectedIds: [] as string[],
        }
      }
      const [shortlisted, sent, connected] = await Promise.all([
        getShortlistedIds().catch(() => []),
        getSentInterestIds().catch(() => []),
        getConnectedProfileIds().catch(() => []),
      ])
      return {
        shortlistedIds: shortlisted,
        sentInterestIds: sent,
        connectedIds: connected,
      }
    },
    enabled: true,
    staleTime: 45 * 1000, // 45 seconds
  })

  const shortlistedIds = query.data?.shortlistedIds || []
  const sentInterestIds = query.data?.sentInterestIds || []
  const connectedIds = query.data?.connectedIds || []

  return {
    shortlistedIds,
    sentInterestIds,
    connectedIds,
    shortlistedSet: new Set(shortlistedIds),
    sentInterestSet: new Set(sentInterestIds),
    connectedSet: new Set(connectedIds),
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}

/**
 * Shared cached hook for User Premium / Subscription Status.
 * Stale time: 5 minutes.
 */
export function useUserSubscription() {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.user_id

  const query = useQuery<SubscriptionStatus>({
    queryKey: queryKeys.subscription.status(userId),
    queryFn: async () => {
      if (!isAuthenticated) {
        return {
          is_active: false,
          days_remaining: 0,
          features: {},
        }
      }
      return getSubscriptionStatus()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  })

  return {
    isPremium: Boolean(query.data?.is_active),
    subscription: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
