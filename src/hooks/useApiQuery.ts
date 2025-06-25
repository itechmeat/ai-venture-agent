import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime: number;
    [key: string]: unknown;
  };
}

async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result: APIResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data as T;
}

export function useApiQuery<T>(
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey: ['api', endpoint],
    queryFn: () => apiRequest<T>(endpoint),
    ...options,
  });
}
