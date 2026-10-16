import { getAuthHeaders } from './authApi';
import { API_BASE_URL } from './config';

export interface ConnectionPrivacyItem {
  connection_id: string;
  other_user_id: string;
  other_profile_id: string;
  other_name: string;
  other_gender?: string;
  other_photo_url?: string;
  other_city?: string;
  other_state?: string;
  other_occupation?: string;
  connected_at?: string;
  my_sharing_phone: boolean;
  my_sharing_email: boolean;
  my_shared_at?: string;
  their_sharing_phone: boolean;
  their_sharing_email: boolean;
  revealed_phone?: string;
  revealed_email?: string;
}

export interface ContactPermissionResponse {
  connection_id: string;
  id?: string;
  owner_user_id: string;
  recipient_user_id: string;
  phone_shared: boolean;
  email_shared: boolean;
  created_at?: string;
  updated_at?: string;
  revoked_at?: string;
}

export interface ContactPermissionUpdate {
  phone_shared: boolean;
  email_shared: boolean;
}

export interface SharedContactDetailsResponse {
  owner_user_id: string;
  recipient_user_id: string;
  phone_shared: boolean;
  email_shared: boolean;
  phone_number?: string;
  email?: string;
}

export async function getConnectionPrivacyList(): Promise<ConnectionPrivacyItem[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/connections/contact-privacy`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch contact privacy connections');
  }
  const rawList = await res.json();
  return (rawList || []).map((item: any) => {
    const phoneShared = item.my_sharing_phone ?? item.my_sharing?.phone_shared ?? false;
    const emailShared = item.my_sharing_email ?? item.my_sharing?.email_shared ?? false;
    const theirPhoneShared = item.their_sharing_phone ?? item.their_sharing?.phone_shared ?? false;
    const theirEmailShared = item.their_sharing_email ?? item.their_sharing?.email_shared ?? false;
    const name = item.other_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Connected Member';

    return {
      connection_id: item.connection_id,
      other_user_id: item.other_user_id,
      other_profile_id: item.other_profile_id,
      other_name: name,
      other_gender: item.other_gender || item.gender,
      other_photo_url: item.other_photo_url || item.photo_url,
      other_city: item.other_city || item.current_city,
      other_state: item.other_state || item.current_state,
      other_occupation: item.other_occupation || item.occupation,
      connected_at: item.connected_at,
      my_sharing_phone: Boolean(phoneShared),
      my_sharing_email: Boolean(emailShared),
      their_sharing_phone: Boolean(theirPhoneShared),
      their_sharing_email: Boolean(theirEmailShared),
      revealed_phone: item.revealed_phone,
      revealed_email: item.revealed_email,
    };
  });
}

export async function getContactPermissionsForConnection(
  connectionId: string
): Promise<ContactPermissionResponse> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/connections/${connectionId}/contact-permissions`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch contact permissions');
  }
  return res.json();
}

export async function updateContactPermissions(
  connectionId: string,
  update: ContactPermissionUpdate
): Promise<ContactPermissionResponse> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/connections/${connectionId}/contact-permissions`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update contact permissions');
  }
  return res.json();
}

export async function revokeContactPermissions(connectionId: string): Promise<{ message: string }> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/connections/${connectionId}/contact-permissions`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to revoke contact permissions');
  }
  return res.json();
}

export async function getSharedContactDetails(
  target: { connectionId?: string; userId?: string }
): Promise<SharedContactDetailsResponse> {
  const headers = getAuthHeaders();
  const endpoint = target.connectionId
    ? `${API_BASE_URL}/connections/${target.connectionId}/shared-contact-details`
    : `${API_BASE_URL}/users/${target.userId}/shared-contact-details`;

  const res = await fetch(endpoint, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch shared contact details');
  }
  return res.json();
}
