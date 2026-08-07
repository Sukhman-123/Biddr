import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/services/api/client';

type ApiHealth = {
  status: 'ok';
  app: string;
  timestamp: string;
};

async function getApiHealth() {
  const response = await apiClient.get<ApiHealth>('/health');
  return response.data;
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: getApiHealth,
    refetchOnWindowFocus: false,
  });
}
