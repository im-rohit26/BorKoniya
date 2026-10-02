import { getAuthHeaders } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface InterestItem {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  status: 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  sent_at: string;
  responded_at?: string;
  profile: any;
}

export interface ShortlistItem {
  id: string;
  target_profile_id: string;
  created_at: string;
  profile: any;
}

export interface ConversationSummary {
  id: string;
  other_profile: {
    profile_id: string;
    first_name: string;
    last_name: string;
    photo_url?: string;
    community?: string;
    current_city?: string;
    current_state?: string;
    occupation?: string;
    is_online: boolean;
  };
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  can_chat: boolean;
  created_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  sender_name: string;
  content: string;
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
}

export interface InterestsSummary {
  received_pending: number;
  received_accepted: number;
  sent_pending: number;
  sent_accepted: number;
  total_active_connections: number;
}

// 1. Express Interest APIs
export async function sendInterest(receiverProfileId: string) {
  const res = await fetch(`${API_BASE_URL}/interests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ receiver_profile_id: receiverProfileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send interest' }));
    throw new Error(err.detail || 'Failed to send interest');
  }
  return res.json();
}

export async function getReceivedInterests(statusFilter?: string): Promise<InterestItem[]> {
  const url = statusFilter
    ? `${API_BASE_URL}/interests/received?status_filter=${statusFilter}`
    : `${API_BASE_URL}/interests/received`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load received interests');
  return res.json();
}

export async function getSentInterests(statusFilter?: string): Promise<InterestItem[]> {
  const url = statusFilter
    ? `${API_BASE_URL}/interests/sent?status_filter=${statusFilter}`
    : `${API_BASE_URL}/interests/sent`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load sent interests');
  return res.json();
}

export async function getSentInterestIds(): Promise<string[]> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/interests/sent/ids`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to getSentInterests
  }

  try {
    const sent = await getSentInterests();
    return sent.map((item) => item.receiver_profile_id);
  } catch {
    return [];
  }
}

export async function acceptInterest(interestId: string) {
  const res = await fetch(`${API_BASE_URL}/interests/${interestId}/accept`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to accept interest' }));
    throw new Error(err.detail || 'Failed to accept interest');
  }
  return res.json();
}

export async function declineInterest(interestId: string) {
  const res = await fetch(`${API_BASE_URL}/interests/${interestId}/decline`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to decline interest' }));
    throw new Error(err.detail || 'Failed to decline interest');
  }
  return res.json();
}

export async function cancelInterest(interestId: string) {
  const res = await fetch(`${API_BASE_URL}/interests/${interestId}/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to cancel interest' }));
    throw new Error(err.detail || 'Failed to cancel interest');
  }
  return res.json();
}

export async function getInterestsSummary(): Promise<InterestsSummary> {
  const res = await fetch(`${API_BASE_URL}/interests/summary`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    return {
      received_pending: 0,
      received_accepted: 0,
      sent_pending: 0,
      sent_accepted: 0,
      total_active_connections: 0,
    };
  }
  return res.json();
}

// 2. Shortlist APIs
export async function addToShortlist(profileId: string) {
  const res = await fetch(`${API_BASE_URL}/shortlist/${profileId}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to shortlist profile' }));
    throw new Error(err.detail || 'Failed to shortlist profile');
  }
  return res.json();
}

export async function removeFromShortlist(profileId: string) {
  const res = await fetch(`${API_BASE_URL}/shortlist/${profileId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to remove from shortlist' }));
    throw new Error(err.detail || 'Failed to remove from shortlist');
  }
  return res.json();
}

export async function getShortlist(): Promise<ShortlistItem[]> {
  const res = await fetch(`${API_BASE_URL}/shortlist`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch shortlist');
  return res.json();
}

export async function getShortlistedIds(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/shortlist/ids`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

// 3. Conversation & Chat APIs
export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE_URL}/conversations`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load conversations' }));
    throw new Error(err.detail || 'Failed to load conversations');
  }
  return res.json();
}

export async function startOrGetConversation(targetProfileId: string, initialMessage?: string) {
  const res = await fetch(`${API_BASE_URL}/conversations/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      target_profile_id: targetProfileId,
      initial_message: initialMessage,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start conversation' }));
    throw new Error(err.detail || 'Failed to start conversation');
  }
  return res.json();
}

export async function getMessages(conversationId: string): Promise<MessageItem[]> {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load messages' }));
    throw new Error(err.detail || 'Failed to load messages');
  }
  return res.json();
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageItem> {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
    throw new Error(err.detail || 'Failed to send message');
  }
  return res.json();
}

export async function markConversationRead(conversationId: string) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return null;
  return res.json();
}

// 4. Safety APIs (Block & Report)
export async function blockProfile(blockedProfileId: string) {
  const res = await fetch(`${API_BASE_URL}/safety/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ blocked_profile_id: blockedProfileId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to block profile' }));
    throw new Error(err.detail || 'Failed to block profile');
  }
  return res.json();
}

export async function unblockProfile(profileId: string) {
  const res = await fetch(`${API_BASE_URL}/safety/block/${profileId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to unblock profile' }));
    throw new Error(err.detail || 'Failed to unblock profile');
  }
  return res.json();
}

export async function getBlockedProfiles() {
  const res = await fetch(`${API_BASE_URL}/safety/blocked`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function reportProfile(reportedProfileId: string, reason: string, description?: string) {
  const res = await fetch(`${API_BASE_URL}/safety/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      reported_profile_id: reportedProfileId,
      reason,
      description,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit report' }));
    throw new Error(err.detail || 'Failed to submit report');
  }
  return res.json();
}
