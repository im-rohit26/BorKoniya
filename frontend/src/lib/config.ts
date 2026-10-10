// Central API & Environment Configuration
const rawApiUrl: string =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.Backend_API_URL as string) ||
  (import.meta.env.BACKEND_API_URL as string) ||
  'https://borkonya-api-507484399075.asia-south1.run.app/api/v1';

const cleanUrl = rawApiUrl.trim().replace(/\/+$/, '');
export const API_BASE_URL: string = cleanUrl.endsWith('/api/v1')
  ? cleanUrl
  : `${cleanUrl}/api/v1`;

export const BACKEND_ROOT_URL: string = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
