import { useState, useCallback } from 'react';

import { APIClient } from '@/utils/api';
import type { APIResponse } from '@/lib/api/base-handler';
import type { Startup, FullStartupAPIResponse, StartupListResponse } from '@/types';
import type { MultiExpertAnalysisResult, AvailableModel, VentureAgentAnalysisResult, ExpertAnalysisResult } from '@/types/ai';
import investmentExperts from '@/data/investment_experts.json';
import type { InvestmentExpert } from '@/types/expert';

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

  const updateExpertAnalyses = useCallback(
    (startupId: string, updater: (analyses: ExpertAnalysisResult[]) => ExpertAnalysisResult[]) => {
      setStartupsWithFullData(prev =>
        prev.map(item =>
          item.startup.id === startupId
            ? { ...item, aiAnalysis: { expert_analyses: updater(item.aiAnalysis?.expert_analyses || []) } }
            : item
        )
      );
    },
    []
  );

  const processRegularExperts = useCallback(
    async (
      startupId: string,
      fullData: FullStartupAPIResponse['data']['data'],
      selectedModel: AvailableModel,
      regularExpertSlugs: string[]
    ) => {
      updateExpertAnalyses(startupId, analyses =>
        analyses.map(a =>
          regularExpertSlugs.includes(a.expert_slug)
            ? { ...a, status: 'loading' as const }
            : a
        )
      );

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const response = await APIClient.post<{
            analysis: MultiExpertAnalysisResult;
            metadata: {
              processingTime: number;
              attempts: number;
              model: string;
              ragExpertsCount: number;
              regularExpertsCount: number;
              requiresAsyncProcessing: boolean;
            };
          }>('make-decision', {
            projectData: fullData,
            selectedModel,
            selectedExperts: regularExpertSlugs,
          });

          if (response.success && response.data) {
            const regularResults = response.data.analysis.expert_analyses;
            const firstCompleted = regularResults.find(r => r.status === 'completed');
            const firstSlug = firstCompleted?.expert_slug || regularResults[0]?.expert_slug;

            updateStartupData(startupId, {
              processingStatus: 'success',
              processingMessage: 'Data processed successfully',
              activeExpertSlug: firstSlug,
              aiAttempts: attempts,
            });

            // Merge regular experts results
            updateExpertAnalyses(startupId, analyses =>
              analyses.map(a => {
                const result = regularResults.find(r => r.expert_slug === a.expert_slug);
                return result
                  ? { ...a, status: 'completed' as const, analysis: result.analysis, metadata: response.data!.metadata }
                  : a;
              })
            );

            return;
          } else {
            throw new Error(response.error || 'AI analysis failed');
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`AI analysis attempt ${attempts} failed:`, error);

          if (attempts >= maxAttempts) {
            updateStartupData(startupId, {
              processingStatus: 'error',
              processingMessage: `Failed to process data after ${maxAttempts} attempts`,
              aiAttempts: attempts,
            });
            updateExpertAnalyses(startupId, analyses =>
              analyses.map(a =>
                regularExpertSlugs.includes(a.expert_slug)
                  ? { ...a, status: 'error' as const, error: errMsg }
                  : a
              )
            );
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    },
    [updateExpertAnalyses, updateStartupData]
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

  // Process RAG expert analysis separately
  const processRagExpert = useCallback(
    async (
      startupId: string,
      expertSlug: string,
      fullData: FullStartupAPIResponse['data']['data'],
      selectedModel: AvailableModel,
    ) => {
      console.log(`[processRagExpert] Starting analysis for ${expertSlug}`);
      
      // Update expert status to loading using the helper function
      updateExpertAnalyses(startupId, analyses =>
        analyses.map(analysis =>
          analysis.expert_slug === expertSlug
            ? { ...analysis, status: 'loading' as const, error: undefined }
            : analysis
        )
      );

      try {
        const response = await APIClient.post<{
          expert_slug: string;
          expert_name: string;
          analysis: VentureAgentAnalysisResult;
          metadata: {
            processingTime: number;
            attempts: number;
            model: string;
          };
        }>('analyze-rag', {
          projectData: fullData,
          expertSlug,
          selectedModel,
        });

        if (response.success && response.data) {
          console.log(`[processRagExpert] Analysis completed for ${expertSlug}`);
          
          // Update the specific expert analysis with completed status
          updateExpertAnalyses(startupId, analyses =>
            analyses.map(analysis =>
              analysis.expert_slug === expertSlug
                ? {
                    ...analysis,
                    analysis: response.data!.analysis,
                    status: 'completed' as const,
                    metadata: response.data!.metadata,
                    error: undefined,
                  }
                : analysis
            )
          );
        } else {
          throw new Error(response.error || 'RAG analysis failed');
        }
      } catch (error) {
        console.error(`[processRagExpert] Analysis failed for ${expertSlug}:`, error);
        
        // Update expert status to error
        updateExpertAnalyses(startupId, analyses =>
          analyses.map(analysis =>
            analysis.expert_slug === expertSlug
              ? {
                  ...analysis,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : analysis
          )
        );
      }
    },
    [updateExpertAnalyses],
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

      const selectedExpertsData = selectedExperts.map(
        slug => investmentExperts.find(e => e.slug === slug) as InvestmentExpert
      );
      const ragExpertSlugs = selectedExpertsData
        .filter(e => e.isRagExpert)
        .map(e => e.slug);
      const regularExpertSlugs = selectedExpertsData
        .filter(e => !e.isRagExpert)
        .map(e => e.slug);

      const initialAnalyses: ExpertAnalysisResult[] = selectedExpertsData.map(expert => ({
        expert_slug: expert.slug,
        expert_name: expert.name,
        status: 'loading' as const,
        analysis: undefined as unknown as VentureAgentAnalysisResult,
      }));

      updateStartupData(startupId, {
        aiAnalysis: { expert_analyses: initialAnalyses },
      });

      ragExpertSlugs.forEach(slug => {
        processRagExpert(startupId, slug, fullData, selectedModel);
      });

      await processRegularExperts(
        startupId,
        fullData,
        selectedModel,
        regularExpertSlugs
      );
    },
    [updateStartupData, processRagExpert, processRegularExperts]
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

  const retryRagExpert = useCallback(
    async (startupId: string, expertSlug: string, selectedModel: AvailableModel) => {
      console.log(`[retryRagExpert] Retrying analysis for ${expertSlug} on startup ${startupId}`);
      
      const startupData = startupsWithFullData.find(item => item.startup.id === startupId);
      if (!startupData?.fullData) {
        console.error('[retryRagExpert] No full data available for RAG expert retry');
        return;
      }

      try {
        await processRagExpert(startupId, expertSlug, startupData.fullData, selectedModel);
      } catch (error) {
        console.error(`[retryRagExpert] Failed to retry analysis for ${expertSlug}:`, error);
      }
    },
    [startupsWithFullData, processRagExpert],
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
    retryRagExpert,
    analyzeStartups,
  };
}
