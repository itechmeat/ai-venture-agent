import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { VentureAgentAnalysisResult } from '@/types/ai';
import type { APIResponse } from '@/lib/api/base-handler';

interface VentureAgentAPIResponse {
  analysis: VentureAgentAnalysisResult;
  metadata: {
    processingTime: number;
    attempts: number;
    model: string;
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

async function ventureAgentAnalysis(projectData: unknown): Promise<VentureAgentAPIResponse> {
  const response = await fetch('/api/make-decision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ projectData }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: APIResponse<VentureAgentAPIResponse> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  return data.data as VentureAgentAPIResponse;
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

export function useVentureAgentAnalysis(
  projectData: unknown,
  options?: Omit<UseQueryOptions<VentureAgentAPIResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<VentureAgentAPIResponse>({
    queryKey: ['venture-agent-analysis', projectData],
    queryFn: () => ventureAgentAnalysis(projectData),
    enabled: !!projectData, // Only run if we have project data
    retry: false, // Don't retry - our API already has retry logic
    ...options,
  });
}
