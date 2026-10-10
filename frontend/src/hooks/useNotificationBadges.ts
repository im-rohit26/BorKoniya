import { useState, useEffect, useCallback } from 'react';
import { getInterestsSummary, getConversations } from '../lib/interactionApi';
import { getAuthToken } from '../lib/authApi';

interface BadgeCounts {
  unreadMessagesCount: number;
  pendingInterestsCount: number;
  refreshCounts: () => Promise<void>;
}

// Global shared state for instantaneous synchronization across components
let globalUnreadMessages = 0;
let globalPendingInterests = 0;
const subscribers = new Set<(badges: { unreadMessages: number; pendingInterests: number }) => void>();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback({
        unreadMessages: globalUnreadMessages,
        pendingInterests: globalPendingInterests,
      });
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function setGlobalBadgeCounts(unreadMessages?: number, pendingInterests?: number) {
  let changed = false;
  if (typeof unreadMessages === 'number' && globalUnreadMessages !== unreadMessages) {
    globalUnreadMessages = Math.max(0, unreadMessages);
    changed = true;
  }
  if (typeof pendingInterests === 'number' && globalPendingInterests !== pendingInterests) {
    globalPendingInterests = Math.max(0, pendingInterests);
    changed = true;
  }
  if (changed) {
    notifySubscribers();
  }
}

// Module-level in-flight deduplication and throttle guard
let inFlightRefreshPromise: Promise<void> | null = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL_MS = 15000; // minimum 15s between full fetches

async function executeGlobalBadgeRefresh(force = false): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    setGlobalBadgeCounts(0, 0);
    return;
  }

  const now = Date.now();
  if (!force && inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  if (!force && now - lastRefreshTime < MIN_REFRESH_INTERVAL_MS) {
    return;
  }

  inFlightRefreshPromise = (async () => {
    try {
      lastRefreshTime = Date.now();
      const [summaryRes, convsRes] = await Promise.allSettled([
        getInterestsSummary(),
        getConversations(),
      ]);

      let newPending = globalPendingInterests;
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        newPending = summaryRes.value.received_pending || 0;
      }

      let newUnread = globalUnreadMessages;
      if (convsRes.status === 'fulfilled' && Array.isArray(convsRes.value)) {
        newUnread = convsRes.value.reduce(
          (sum: number, c: any) => sum + (Number(c.unread_count) || 0),
          0
        );
      }

      setGlobalBadgeCounts(newUnread, newPending);
    } catch (err) {
      console.warn('Failed to refresh notification badges:', err);
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

// Singleton tab-wide polling timer (60s instead of 8s, single instance for entire tab)
let globalPollTimer: ReturnType<typeof setInterval> | null = null;
let activeHookCount = 0;

function startGlobalPolling() {
  activeHookCount++;
  if (!globalPollTimer && typeof window !== 'undefined') {
    // Run initial refresh
    executeGlobalBadgeRefresh();
    // Low-frequency background poll (60 seconds)
    globalPollTimer = setInterval(() => {
      executeGlobalBadgeRefresh();
    }, 60000);
  }
}

function stopGlobalPolling() {
  activeHookCount = Math.max(0, activeHookCount - 1);
  if (activeHookCount === 0 && globalPollTimer) {
    clearInterval(globalPollTimer);
    globalPollTimer = null;
  }
}

export function useNotificationBadges(): BadgeCounts {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(globalUnreadMessages);
  const [pendingInterestsCount, setPendingInterestsCount] = useState<number>(globalPendingInterests);

  const refreshCounts = useCallback(async () => {
    return executeGlobalBadgeRefresh(true);
  }, []);

  useEffect(() => {
    const sub = (data: { unreadMessages: number; pendingInterests: number }) => {
      setUnreadMessagesCount(data.unreadMessages);
      setPendingInterestsCount(data.pendingInterests);
    };

    subscribers.add(sub);
    startGlobalPolling();

    const handleMessagesRead = () => {
      executeGlobalBadgeRefresh(true);
    };

    const handleUnreadUpdated = (ev: any) => {
      if (ev.detail && typeof ev.detail.unreadCount === 'number') {
        setGlobalBadgeCounts(ev.detail.unreadCount, undefined);
      } else {
        executeGlobalBadgeRefresh(true);
      }
    };

    const handleInterestsUpdated = (ev: any) => {
      if (ev.detail && typeof ev.detail.pendingCount === 'number') {
        setGlobalBadgeCounts(undefined, ev.detail.pendingCount);
      } else {
        executeGlobalBadgeRefresh(true);
      }
    };

    window.addEventListener('borkonya:messages-read', handleMessagesRead);
    window.addEventListener('borkonya:unread-updated', handleUnreadUpdated);
    window.addEventListener('borkonya:interests-updated', handleInterestsUpdated);

    return () => {
      subscribers.delete(sub);
      stopGlobalPolling();
      window.removeEventListener('borkonya:messages-read', handleMessagesRead);
      window.removeEventListener('borkonya:unread-updated', handleUnreadUpdated);
      window.removeEventListener('borkonya:interests-updated', handleInterestsUpdated);
    };
  }, []);

  return {
    unreadMessagesCount,
    pendingInterestsCount,
    refreshCounts,
  };
}
