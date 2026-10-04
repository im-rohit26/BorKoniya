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
    gender?: string;
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

export interface ReplySnippet {
  id: string;
  sender_name: string;
  content: string;
  message_type?: string;
  media_url?: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  sender_name: string;
  sender_gender?: string;
  content: string;
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
  reply_to_message_id?: string;
  reply_to?: ReplySnippet | null;
  is_forwarded?: boolean;
  forwarded_from_message_id?: string;
  message_type?: string;
  media_url?: string;
  deleted_for_everyone?: boolean;
  deleted_at?: string;
  can_delete_for_everyone?: boolean;
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

export async function getConnectedProfileIds(): Promise<string[]> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/interests/connected/ids`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to querying received & sent accepted
  }

  try {
    const [received, sent] = await Promise.all([
      getReceivedInterests('ACCEPTED').catch(() => []),
      getSentInterests('ACCEPTED').catch(() => []),
    ]);
    const ids = new Set<string>();
    received.forEach((i) => ids.add(i.sender_profile_id));
    sent.forEach((i) => ids.add(i.receiver_profile_id));
    return Array.from(ids);
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

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: { replyToMessageId?: string; mediaUrl?: string; messageType?: string }
): Promise<MessageItem> {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      content,
      reply_to_message_id: options?.replyToMessageId,
      media_url: options?.mediaUrl,
      message_type: options?.messageType || 'text',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
    throw new Error(err.detail || 'Failed to send message');
  }
  return res.json();
}

export async function forwardMessages(
  messageIds: string[],
  targetConversationIds?: string[],
  targetProfileIds?: string[]
) {
  const res = await fetch(`${API_BASE_URL}/conversations/forward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      message_ids: messageIds,
      target_conversation_ids: targetConversationIds,
      target_profile_ids: targetProfileIds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to forward messages' }));
    throw new Error(err.detail || 'Failed to forward messages');
  }
  return res.json();
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  deleteType: 'for_me' | 'for_everyone' = 'for_me'
) {
  const res = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/${messageId}?delete_type=${deleteType}`,
    {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete message' }));
    throw new Error(err.detail || 'Failed to delete message');
  }
  return res.json();
}

export async function deleteConversationForMe(conversationId: string) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete conversation' }));
    throw new Error(err.detail || 'Failed to delete conversation');
  }
  return res.json();
}

export async function clearConversation(conversationId: string) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/clear`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to clear conversation' }));
    throw new Error(err.detail || 'Failed to clear conversation');
  }
  return res.json();
}

export async function batchDeleteMessages(messageIds: string[]) {
  const res = await fetch(`${API_BASE_URL}/conversations/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message_ids: messageIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete messages' }));
    throw new Error(err.detail || 'Failed to delete messages');
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

// 5. Chat Media & Attachment APIs
export async function uploadChatAttachment(
  conversationId: string,
  file: File,
  attachmentType: 'image' | 'document'
): Promise<{
  media_url: string;
  message_type: 'image' | 'document';
  original_filename: string;
  size_bytes: number;
  mime_type: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachment_type', attachmentType);

  const authHeaders = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/attachment`, {
    method: 'POST',
    headers: {
      ...(authHeaders.Authorization ? { Authorization: authHeaders.Authorization } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload attachment' }));
    let msg = err.detail;
    if (Array.isArray(msg)) msg = msg.map((e: any) => e.msg || e.message).join(', ');
    throw new Error(msg || 'Failed to upload attachment');
  }
  return res.json();
}

