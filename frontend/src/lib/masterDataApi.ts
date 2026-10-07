import { API_BASE_URL } from './config';

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

const cache = new Map<string, Promise<any>>();

async function fetchMasterData<T>(endpoint: string): Promise<T> {
  if (cache.has(endpoint)) {
    return cache.get(endpoint) as Promise<T>;
  }

  const promise = fetch(`${API_BASE_URL}/master-data${endpoint}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load master data: ${endpoint}`);
      return (await res.json()) as T;
    })
    .catch((err) => {
      cache.delete(endpoint);
      throw err;
    });

  cache.set(endpoint, promise);
  return promise;
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
