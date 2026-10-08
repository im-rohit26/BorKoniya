import { useState, useEffect, useCallback, useRef } from 'react';
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

export function useNotificationBadges(): BadgeCounts {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(globalUnreadMessages);
  const [pendingInterestsCount, setPendingInterestsCount] = useState<number>(globalPendingInterests);
  const isFetchingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setGlobalBadgeCounts(0, 0);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
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
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = (data: { unreadMessages: number; pendingInterests: number }) => {
      setUnreadMessagesCount(data.unreadMessages);
      setPendingInterestsCount(data.pendingInterests);
    };

    subscribers.add(sub);
    // Initial fetch
    refreshCounts();

    const handleMessagesRead = () => {
      refreshCounts();
    };

    const handleUnreadUpdated = (ev: any) => {
      if (ev.detail && typeof ev.detail.unreadCount === 'number') {
        setGlobalBadgeCounts(ev.detail.unreadCount, undefined);
      } else {
        refreshCounts();
      }
    };

    const handleInterestsUpdated = (ev: any) => {
      if (ev.detail && typeof ev.detail.pendingCount === 'number') {
        setGlobalBadgeCounts(undefined, ev.detail.pendingCount);
      } else {
        refreshCounts();
      }
    };

    window.addEventListener('borkonya:messages-read', handleMessagesRead);
    window.addEventListener('borkonya:unread-updated', handleUnreadUpdated);
    window.addEventListener('borkonya:interests-updated', handleInterestsUpdated);
    window.addEventListener('focus', refreshCounts);

    // Silent background poll every 8s
    const pollTimer = setInterval(refreshCounts, 8000);

    return () => {
      subscribers.delete(sub);
      window.removeEventListener('borkonya:messages-read', handleMessagesRead);
      window.removeEventListener('borkonya:unread-updated', handleUnreadUpdated);
      window.removeEventListener('borkonya:interests-updated', handleInterestsUpdated);
      window.removeEventListener('focus', refreshCounts);
      clearInterval(pollTimer);
    };
  }, [refreshCounts]);

  return {
    unreadMessagesCount,
    pendingInterestsCount,
    refreshCounts,
  };
}
