import { useState, useCallback } from 'react';

import { APIClient } from '@/utils/api';
import type { APIResponse } from '@/lib/api/base-handler';
import type { Startup, FullStartupAPIResponse, StartupListResponse } from '@/types';
import type { MultiExpertAnalysisResult, AvailableModel } from '@/types/ai';

type DataFetchStatus = 'idle' | 'fetching' | 'success' | 'error';
type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

export interface StartupWithFullData {
  startup: Startup;
  fullData?: FullStartupAPIResponse['data']['data'];
  aiAnalysis?: MultiExpertAnalysisResult;
  activeExpertSlug?: string;
  dataFetchStatus: DataFetchStatus;
  dataFetchMessage: string;
  processingStatus: ProcessingStatus;
  processingMessage: string;
  aiAttempts?: number;
}

export function useStartupAnalysis() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsWithFullData, setStartupsWithFullData] = useState<StartupWithFullData[]>([]);
  const [isLoadingStartups, setIsLoadingStartups] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const updateStartupData = useCallback(
    (startupId: string, updates: Partial<StartupWithFullData>) => {
      setStartupsWithFullData(prev =>
        prev.map(item => (item.startup.id === startupId ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const switchActiveExpert = useCallback(
    (startupId: string, expertSlug: string) => {
      updateStartupData(startupId, { activeExpertSlug: expertSlug });
    },
    [updateStartupData],
  );

  const fetchStartups = useCallback(async () => {
    setIsLoadingStartups(true);
    setError(null);

    try {
      const response = await fetch('/api/startups');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse: APIResponse<StartupListResponse['data']> = await response.json();

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API returned unsuccessful response');
      }

      const projects: Startup[] = apiResponse.data?.projects || [];
      setStartups(projects);
      return projects;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching startups:', error);
      return null;
    } finally {
      setIsLoadingStartups(false);
    }
  }, []);

  const fetchFullData = useCallback(
    async (startupId: string) => {
      updateStartupData(startupId, {
        dataFetchStatus: 'fetching',
        dataFetchMessage: 'Fetching startup data...',
      });

      try {
        const response = await fetch(`/api/startups/${startupId}/full`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: FullStartupAPIResponse = await response.json();

        if (result.success && result.data.success) {
          updateStartupData(startupId, {
            dataFetchStatus: 'success',
            dataFetchMessage: 'Startup data received successfully',
            fullData: result.data.data,
          });
          return result.data.data;
        } else {
          throw new Error('Failed to fetch full startup data');
        }
      } catch (error) {
        console.error('Error fetching full startup data:', error);
        updateStartupData(startupId, {
          dataFetchStatus: 'error',
          dataFetchMessage: `Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        return null;
      }
    },
    [updateStartupData],
  );

  const analyzeWithAI = useCallback(
    async (
      startupId: string,
      fullData: FullStartupAPIResponse['data']['data'],
      selectedModel: AvailableModel,
      selectedExperts: string[],
    ) => {
      updateStartupData(startupId, {
        processingStatus: 'processing',
        processingMessage: 'Processing startup data...',
      });

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const response = await APIClient.post<{
            analysis: MultiExpertAnalysisResult;
            metadata: { processingTime: number; attempts: number; model: string };
          }>('make-decision', {
            projectData: fullData,
            selectedModel,
            selectedExperts,
          });

          if (response.success && response.data) {
            const firstExpertSlug = response.data.analysis.expert_analyses[0]?.expert_slug;
            updateStartupData(startupId, {
              processingStatus: 'success',
              processingMessage: 'Data processed successfully',
              aiAnalysis: response.data.analysis,
              activeExpertSlug: firstExpertSlug,
              aiAttempts: attempts,
            });
            return response.data.analysis;
          } else {
            throw new Error(response.error || 'AI analysis failed');
          }
        } catch (error) {
          console.error(`AI analysis attempt ${attempts} failed:`, error);

          if (attempts >= maxAttempts) {
            updateStartupData(startupId, {
              processingStatus: 'error',
              processingMessage: `Failed to process data after ${maxAttempts} attempts`,
              aiAttempts: attempts,
            });
            return null;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      return null;
    },
    [updateStartupData],
  );

  const retryAIAnalysis = useCallback(
    async (startupId: string, selectedModel: AvailableModel, selectedExperts: string[]) => {
      const startupData = startupsWithFullData.find(item => item.startup.id === startupId);
      if (!startupData?.fullData) {
        console.error('No full data available for retry');
        return;
      }

      const currentAttempts = startupData.aiAttempts || 0;
      const newAttemptCount = currentAttempts + 1;

      updateStartupData(startupId, {
        processingStatus: 'processing',
        processingMessage: `Retrying analysis (attempt ${newAttemptCount})...`,
        aiAttempts: newAttemptCount,
      });

      try {
        const response = await APIClient.post<{
          analysis: MultiExpertAnalysisResult;
          metadata: { processingTime: number; attempts: number; model: string };
        }>('make-decision', {
          projectData: startupData.fullData,
          selectedModel,
          selectedExperts,
        });

        if (response.success && response.data) {
          const firstExpertSlug = response.data.analysis.expert_analyses[0]?.expert_slug;
          updateStartupData(startupId, {
            processingStatus: 'success',
            processingMessage: 'Data processed successfully',
            aiAnalysis: response.data.analysis,
            activeExpertSlug: firstExpertSlug,
            aiAttempts: newAttemptCount,
          });
        } else {
          throw new Error(response.error || 'AI analysis failed');
        }
      } catch (error) {
        console.error(`Retry attempt ${newAttemptCount} failed:`, error);
        updateStartupData(startupId, {
          processingStatus: 'error',
          processingMessage: `Failed to process data after ${newAttemptCount} attempts`,
          aiAttempts: newAttemptCount,
        });
      }
    },
    [startupsWithFullData, updateStartupData],
  );

  const processStartupSequentially = useCallback(
    async (startups: Startup[], selectedModel: AvailableModel, selectedExperts: string[]) => {
      const initialData: StartupWithFullData[] = startups.map(startup => ({
        startup,
        dataFetchStatus: 'idle' as DataFetchStatus,
        dataFetchMessage: '',
        processingStatus: 'idle' as ProcessingStatus,
        processingMessage: '',
      }));
      setStartupsWithFullData(initialData);

      for (let i = 0; i < startups.length; i++) {
        setCurrentProcessingIndex(i);
        const startup = startups[i];

        const fullData = await fetchFullData(startup.id);
        if (!fullData) {
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        await analyzeWithAI(startup.id, fullData, selectedModel, selectedExperts);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCurrentProcessingIndex(-1);
    },
    [fetchFullData, analyzeWithAI],
  );

  const analyzeStartups = useCallback(
    async (selectedModel: AvailableModel, selectedExperts: string[]) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setError(null);

      try {
        const startupsData = await fetchStartups();
        if (!startupsData) {
          return;
        }

        await processStartupSequentially(startupsData, selectedModel, selectedExperts);
      } catch (error) {
        console.error('Error during startup analysis:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchStartups, processStartupSequentially, isProcessing],
  );

  return {
    // State
    startups,
    startupsWithFullData,
    isLoadingStartups,
    isProcessing,
    currentProcessingIndex,
    error,

    // Actions
    switchActiveExpert,
    retryAIAnalysis,
    analyzeStartups,
  };
}
