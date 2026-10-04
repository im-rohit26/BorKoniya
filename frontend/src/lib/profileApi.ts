import { getAuthHeaders } from './authApi';
import type { ProfileCardData } from '../components/cards/ProfileCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface ProfileResponse {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  height_cm: number;
  marital_status: string;
  mother_tongue: string;
  community: string;
  sub_community?: string;
  native_place?: string;
  current_state: string;
  current_city: string;
  highest_qualification: string;
  occupation: string;
  company_name?: string;
  annual_income?: string;
  diet: string;
  about_me?: string;
  smoking?: string;
  drinking?: string;
  rashi?: string;
  nakshatra?: string;
  is_manglik?: string;
  age: number;
  profile_for: string;
  status: string;
  profile_completion_pct: number;
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  match_score?: number;
  match_breakdown?: string[];
  photo_url?: string;
  photos?: PhotoItem[];
  contact_phone_masked?: string;
  contact_email_masked?: string;
  is_contact_revealed: boolean;
  revealed_phone?: string;
  revealed_email?: string;
}

export interface PhotoItem {
  id: string;
  storage_path: string;
  is_primary: boolean;
  privacy: string;
}

export function formatHeight(heightCm?: number): string {
  if (!heightCm) return "5'6\" (168 cm)";
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}" (${heightCm} cm)`;
}

export function mapProfileResponseToCard(
  p: ProfileResponse,
  isShortlisted = false,
  isInterestSent = false,
  isConnected = false
): ProfileCardData {
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name || ''}`.trim(),
    age: p.age,
    height: formatHeight(p.height_cm),
    location: `${p.current_city}, ${p.current_state}`,
    nativePlace: p.native_place || undefined,
    education: p.highest_qualification,
    profession: p.occupation,
    company: p.company_name || undefined,
    community: p.community,
    subCommunity: p.sub_community || undefined,
    photoUrl: p.photo_url || '',
    matchScore: p.match_score || 90,
    matchBreakdown: p.match_breakdown || [],
    isMobileVerified: p.is_mobile_verified,
    isEmailVerified: p.is_email_verified,
    shortBio: p.about_me || 'Verified community profile on BorKonya.',
    isShortlisted: isShortlisted,
    isInterestSent: isInterestSent,
    isConnected: isConnected,
    gender: p.gender,
  };
}

function buildMatchQueryParams(filters: Record<string, any> = {}, limit = 20, page = 1): string {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(limit));
  queryParams.set('page', String(page));
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== 'ALL' && value !== 'ANY' && value !== '') {
      queryParams.set(key, String(value));
    }
  }
  return queryParams.toString();
}

export async function getRecommendedMatches(
  limit = 20,
  filters: Record<string, any> = {},
  page = 1
): Promise<ProfileResponse[]> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/matches/recommended?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch recommended matches');
  }
  return res.json();
}

export async function getNewMatches(
  limit = 20,
  filters: Record<string, any> = {},
  page = 1
): Promise<ProfileResponse[]> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/matches/new?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch new matches');
  }
  return res.json();
}

export async function getNearYouMatches(
  limit = 20,
  filters: Record<string, any> = {},
  page = 1
): Promise<ProfileResponse[]> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/matches/near-you?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch near-you matches');
  }
  return res.json();
}

export async function getProfileVisitors(
  limit = 20,
  filters: Record<string, any> = {},
  page = 1
): Promise<ProfileResponse[]> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/matches/visitors?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch profile visitors');
  }
  return res.json();
}

export async function getSearchProfiles(
  filters: Record<string, any> = {},
  limit = 20,
  page = 1
): Promise<ProfileResponse[]> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/search?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to search profiles');
  }
  return res.json();
}

export async function getSearchProfilesWithTotal(
  filters: Record<string, any> = {},
  limit = 20,
  page = 1
): Promise<{ profiles: ProfileResponse[]; total: number }> {
  const qs = buildMatchQueryParams(filters, limit, page);
  const res = await fetch(`${API_BASE_URL}/search?${qs}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to search profiles');
  }
  const totalHeader = res.headers.get('X-Total-Count');
  const profiles: ProfileResponse[] = await res.json();
  const total = totalHeader ? parseInt(totalHeader, 10) : profiles.length;
  return { profiles, total };
}

export interface DashboardStatsResponse {
  user: {
    first_name: string;
    last_name: string;
    profile_completion_pct: number;
    is_premium: boolean;
    photo_url: string | null;
    gender: string;
    community: string;
  };
  metrics: {
    recommended_count: number;
    received_interests_count: number;
    sent_interests_count: number;
    total_active_connections: number;
    shortlist_count: number;
    active_conversations_count: number;
    profile_views_count: number;
    profile_completion_pct: number;
  };
  recommended_profiles: ProfileResponse[];
}

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const res = await fetch(`${API_BASE_URL}/profile/me/dashboard`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to load dashboard metrics');
  }
  const raw = await res.json();
  const completionPct = raw.metrics?.profile_completion_pct ?? raw.profile_completion_pct ?? 80;
  return {
    user: raw.user || {
      first_name: '',
      last_name: '',
      profile_completion_pct: completionPct,
      is_premium: false,
      photo_url: null,
      gender: '',
      community: '',
    },
    metrics: {
      recommended_count: raw.metrics?.recommended_count ?? raw.recommended_count ?? 0,
      received_interests_count: raw.metrics?.received_interests_count ?? raw.received_interests_count ?? 0,
      sent_interests_count: raw.metrics?.sent_interests_count ?? raw.sent_interests_count ?? 0,
      total_active_connections: raw.metrics?.total_active_connections ?? raw.total_active_connections ?? 0,
      shortlist_count: raw.metrics?.shortlist_count ?? raw.shortlist_count ?? 0,
      active_conversations_count: raw.metrics?.active_conversations_count ?? raw.active_conversations_count ?? 0,
      profile_views_count: raw.metrics?.profile_views_count ?? raw.profile_views_count ?? 0,
      profile_completion_pct: completionPct,
    },
    recommended_profiles: raw.recommended_profiles || raw.top_matches || [],
  };
}

export async function getProfileById(id: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Profile not found or failed to load');
  }
  return res.json();
}

export async function getMyProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Profile not found');
  }
  return res.json();
}

export async function uploadProfilePhoto(file: File, isPrimary = false): Promise<PhotoItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_primary', String(isPrimary));

  const authHeaders = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/profile/me/photos/upload`, {
    method: 'POST',
    headers: {
      ...(authHeaders.Authorization ? { Authorization: authHeaders.Authorization } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload photo' }));
    throw new Error(err.detail || 'Failed to upload photo');
  }
  return res.json();
}

export async function getMyPhotos(): Promise<PhotoItem[]> {
  const res = await fetch(`${API_BASE_URL}/profile/me/photos`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteProfilePhoto(photoId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/profile/me/photos/${photoId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete photo' }));
    throw new Error(err.detail || 'Failed to delete photo');
  }
  return res.json();
}

export async function setPrimaryPhoto(photoId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/profile/me/photos/${photoId}/primary`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to set primary photo' }));
    throw new Error(err.detail || 'Failed to set primary photo');
  }
  return res.json();
}


