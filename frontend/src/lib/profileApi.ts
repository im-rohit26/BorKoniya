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
  age: number;
  profile_for: string;
  status: string;
  profile_completion_pct: number;
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  match_score?: number;
  match_breakdown?: string[];
  photo_url?: string;
  contact_phone_masked?: string;
  contact_email_masked?: string;
  is_contact_revealed: boolean;
  revealed_phone?: string;
  revealed_email?: string;
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
  isInterestSent = false
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
    gender: p.gender,
  };
}

export async function getRecommendedMatches(limit = 3): Promise<ProfileResponse[]> {
  const res = await fetch(`${API_BASE_URL}/matches/recommended?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch recommended matches');
  }
  return res.json();
}

export async function getNewMatches(limit = 3): Promise<ProfileResponse[]> {
  const res = await fetch(`${API_BASE_URL}/matches/new?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch new matches');
  }
  return res.json();
}

export async function getNearYouMatches(limit = 3): Promise<ProfileResponse[]> {
  const res = await fetch(`${API_BASE_URL}/matches/near-you?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch near-you matches');
  }
  return res.json();
}

export async function getSearchProfiles(
  filters: Record<string, any>,
  limit = 3
): Promise<ProfileResponse[]> {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(limit));

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== 'ALL' && value !== 'ANY' && value !== '') {
      queryParams.set(key, String(value));
    }
  }

  const res = await fetch(`${API_BASE_URL}/search?${queryParams.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error('Failed to search profiles');
  }
  return res.json();
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

