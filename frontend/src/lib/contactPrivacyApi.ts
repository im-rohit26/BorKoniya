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
  id: string;
  owner_user_id: string;
  recipient_user_id: string;
  phone_shared: boolean;
  email_shared: boolean;
  updated_at?: string;
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
  return res.json();
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
