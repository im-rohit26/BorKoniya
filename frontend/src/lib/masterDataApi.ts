const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface SelectOption {
  value: string;
  label: string;
}

export interface Community {
  id: number;
  name: string;
}

export interface SubCommunity {
  id: number;
  community_id: number;
  name: string;
}

async function fetchMasterData<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/master-data${endpoint}`);
  if (!res.ok) throw new Error(`Failed to load master data: ${endpoint}`);
  return res.json();
}

export const masterDataApi = {
  getCommunities: () => fetchMasterData<Community[]>('/communities'),
  getSubCommunities: (communityId?: number) =>
    fetchMasterData<SubCommunity[]>(`/sub-communities${communityId ? `?community_id=${communityId}` : ''}`),
  getMaritalStatuses: () => fetchMasterData<SelectOption[]>('/marital-statuses'),
  getDietOptions: () => fetchMasterData<SelectOption[]>('/diet-options'),
  getEducationLevels: () => fetchMasterData<SelectOption[]>('/education-levels'),
  getProfessions: () => fetchMasterData<SelectOption[]>('/professions'),
  getIncomeRanges: () => fetchMasterData<SelectOption[]>('/income-ranges'),
  getStates: () => fetchMasterData<SelectOption[]>('/states'),
  getHeightOptions: () => fetchMasterData<SelectOption[]>('/height-options'),
  getIcebreakers: () => fetchMasterData<string[]>('/icebreakers'),
  getProfileForOptions: () => fetchMasterData<SelectOption[]>('/profile-for-options'),
  getMotherTongueOptions: () => fetchMasterData<string[]>('/mother-tongue-options'),
};
