// Central API & Environment Configuration
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.Backend_API_URL as string) ||
  (import.meta.env.BACKEND_API_URL as string) ||
  'https://borkoniya-4.onrender.com/api/v1';

export const BACKEND_ROOT_URL: string = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
