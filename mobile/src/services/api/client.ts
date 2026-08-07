import { create } from 'axios';

import { environment } from '@/config/environment';
import { tokenStorage } from '@/services/auth/token-storage';

export const apiClient = create({
  baseURL: environment.apiUrl,
  timeout: 15_000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) await tokenStorage.clear();
    return Promise.reject(error);
  },
);
