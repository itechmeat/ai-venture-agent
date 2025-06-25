'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components';
import { Startup, FullStartupAPIResponse, StartupListResponse } from '@/types';
import {
  VentureAgentAnalysisResult,
  AVAILABLE_MODELS,
  MODEL_DISPLAY_NAMES,
  AvailableModel,
  AI_MODELS,
} from '@/types/ai';
import { APIClient } from '@/utils/api';
import styles from './StartupList.module.scss';

interface StartupListProps {
  className?: string;
}

type DataFetchStatus = 'idle' | 'fetching' | 'success' | 'error';
type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

interface StartupWithFullData {
  startup: Startup;
  fullData?: FullStartupAPIResponse['data']['data'];
  aiAnalysis?: VentureAgentAnalysisResult;
  dataFetchStatus: DataFetchStatus;
  dataFetchMessage: string;
  processingStatus: ProcessingStatus;
  processingMessage: string;
  aiAttempts?: number;
}

interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime: number;
    totalProjects: number;
  };
}

export function StartupList({ className }: StartupListProps) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsWithFullData, setStartupsWithFullData] = useState<StartupWithFullData[]>([]);
  const [isLoadingStartups, setIsLoadingStartups] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetailedAnalysis, setExpandedDetailedAnalysis] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<AvailableModel>(AI_MODELS.GEMINI_FLASH);

  const toggleDetailedAnalysis = useCallback((startupId: string) => {
    setExpandedDetailedAnalysis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(startupId)) {
        newSet.delete(startupId);
      } else {
        newSet.add(startupId);
      }
      return newSet;
    });
  }, []);

  const updateStartupData = useCallback(
    (startupId: string, updates: Partial<StartupWithFullData>) => {
      setStartupsWithFullData(prev =>
        prev.map(item => (item.startup.id === startupId ? { ...item, ...updates } : item)),
      );
    },
    [],
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

      // Extract the projects array from the response
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
    async (startupId: string, fullData: FullStartupAPIResponse['data']['data']) => {
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
            analysis: VentureAgentAnalysisResult;
            metadata: { processingTime: number; attempts: number; model: string };
          }>('make-decision', {
            projectData: fullData,
            selectedModel,
          });

          if (response.success && response.data) {
            updateStartupData(startupId, {
              processingStatus: 'success',
              processingMessage: 'Data processed successfully',
              aiAnalysis: response.data.analysis,
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

          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      return null;
    },
    [updateStartupData, selectedModel],
  );

  const retryAIAnalysis = useCallback(
    async (startupId: string) => {
      // Find the startup data
      const startupData = startupsWithFullData.find(item => item.startup.id === startupId);
      if (!startupData?.fullData) {
        console.error('No full data available for retry');
        return;
      }

      // Get current attempt count and increment it
      const currentAttempts = startupData.aiAttempts || 0;
      const newAttemptCount = currentAttempts + 1;

      updateStartupData(startupId, {
        processingStatus: 'processing',
        processingMessage: `Retrying analysis (attempt ${newAttemptCount})...`,
        aiAttempts: newAttemptCount,
      });

      try {
        const response = await APIClient.post<{
          analysis: VentureAgentAnalysisResult;
          metadata: { processingTime: number; attempts: number; model: string };
        }>('make-decision', {
          projectData: startupData.fullData,
          selectedModel,
        });

        if (response.success && response.data) {
          updateStartupData(startupId, {
            processingStatus: 'success',
            processingMessage: 'Data processed successfully',
            aiAnalysis: response.data.analysis,
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
    [startupsWithFullData, updateStartupData, selectedModel],
  );

  const processStartupSequentially = useCallback(
    async (startups: Startup[]) => {
      // Initialize all startups
      const initialData: StartupWithFullData[] = startups.map(startup => ({
        startup,
        dataFetchStatus: 'idle' as DataFetchStatus,
        dataFetchMessage: '',
        processingStatus: 'idle' as ProcessingStatus,
        processingMessage: '',
      }));
      setStartupsWithFullData(initialData);

      // Process each startup sequentially
      for (let i = 0; i < startups.length; i++) {
        setCurrentProcessingIndex(i);
        const startup = startups[i];

        // Step 1: Fetch full data
        const fullData = await fetchFullData(startup.id);
        if (!fullData) {
          continue;
        }

        // Small delay after receiving data
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 2: Analyze with AI
        await analyzeWithAI(startup.id, fullData);

        // Small delay before processing next startup
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCurrentProcessingIndex(-1);
    },
    [fetchFullData, analyzeWithAI],
  );

  const analyzeStartups = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      // First, fetch the list of startups
      const startupsData = await fetchStartups();
      if (!startupsData) {
        return;
      }

      // Process startups sequentially
      await processStartupSequentially(startupsData);
    } catch (error) {
      console.error('Error during startup analysis:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [fetchStartups, processStartupSequentially, isProcessing]);

  // Show initial state with button
  if (startups.length === 0 && !isLoadingStartups && !error) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <div className={styles.modelSelector}>
            <label htmlFor="model-select">AI Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value as AvailableModel)}
              disabled={isProcessing}
              className={styles.modelSelect}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model} value={model}>
                  {MODEL_DISPLAY_NAMES[model]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingStartups) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>Loading startups...</h2>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <div className={styles.modelSelector}>
            <label htmlFor="model-select">AI Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value as AvailableModel)}
              disabled={isProcessing}
              className={styles.modelSelect}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model} value={model}>
                  {MODEL_DISPLAY_NAMES[model]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
        <div className={styles.error}>Error loading startups: {error}</div>
      </div>
    );
  }

  if (startups.length === 0) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <div className={styles.modelSelector}>
            <label htmlFor="model-select">AI Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value as AvailableModel)}
              disabled={isProcessing}
              className={styles.modelSelect}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model} value={model}>
                  {MODEL_DISPLAY_NAMES[model]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
        <div className={styles.empty}>No startups found</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h2>Found startups: {startups.length}</h2>
        {isProcessing && currentProcessingIndex >= 0 && (
          <div className={styles.progressInfo}>
            Processing: {currentProcessingIndex + 1} / {startups.length}
          </div>
        )}
        <div className={styles.modelSelector}>
          <label htmlFor="model-select">AI Model:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value as AvailableModel)}
            disabled={isProcessing}
            className={styles.modelSelect}
          >
            {AVAILABLE_MODELS.map(model => (
              <option key={model} value={model}>
                {MODEL_DISPLAY_NAMES[model]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={analyzeStartups} disabled={isProcessing} className={styles.processButton}>
          {isProcessing ? 'Analyzing...' : 'Re-analyze Startups'}
        </button>
      </div>

      <div className={styles.grid}>
        {startupsWithFullData.map(
          ({
            startup,
            fullData,
            aiAnalysis,
            dataFetchStatus,
            dataFetchMessage,
            processingStatus,
            processingMessage,
          }) => (
            <div key={startup.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.logoSection}>
                  {startup.public_snapshot.logo_url ? (
                    <Image
                      src={startup.public_snapshot.logo_url}
                      alt={`${startup.public_snapshot.name || 'Startup'} logo`}
                      width={48}
                      height={48}
                      className={styles.logo}
                    />
                  ) : (
                    <div className={styles.logoPlaceholder}>
                      {(startup.public_snapshot.name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className={styles.mainInfo}>
                  <h3 className={styles.title}>
                    {startup.public_snapshot.name || 'Unnamed Startup'}
                  </h3>
                  {(startup.public_snapshot.city || startup.public_snapshot.country) && (
                    <div className={styles.location}>
                      {[startup.public_snapshot.city, startup.public_snapshot.country]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                </div>

                <div className={styles.rightInfo}>
                  {startup.public_snapshot.status && (
                    <span className={styles.status}>{startup.public_snapshot.status}</span>
                  )}

                  {startup.public_snapshot.website_urls &&
                    startup.public_snapshot.website_urls.length > 0 && (
                      <a
                        href={startup.public_snapshot.website_urls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.website}
                      >
                        Website
                      </a>
                    )}
                </div>
              </div>

              <div className={styles.content}>
                <p className={styles.description}>
                  {startup.public_snapshot.description || 'No description provided'}
                </p>
              </div>

              {/* Status display */}
              <div className={styles.statusSection}>
                <div className={`${styles.statusIndicator} ${styles[`status_${dataFetchStatus}`]}`}>
                  {dataFetchStatus === 'fetching' && <LoadingSpinner size="small" />}
                  {dataFetchStatus === 'idle' && <span className={styles.statusIcon}>⏳</span>}
                  {dataFetchStatus === 'success' && <span className={styles.statusIcon}>✅</span>}
                  {dataFetchStatus === 'error' && <span className={styles.statusIcon}>❌</span>}
                  <span className={styles.statusText}>{dataFetchMessage}</span>
                </div>

                <div
                  className={`${styles.statusIndicator} ${styles[`status_${processingStatus}`]}`}
                >
                  {processingStatus === 'processing' && <LoadingSpinner size="small" />}
                  {processingStatus === 'idle' && <span className={styles.statusIcon}>⏳</span>}
                  {processingStatus === 'success' && <span className={styles.statusIcon}>✅</span>}
                  {processingStatus === 'error' && <span className={styles.statusIcon}>❌</span>}
                  <span className={styles.statusText}>{processingMessage}</span>
                  {processingStatus === 'error' && fullData && (
                    <button
                      className={styles.retryButton}
                      onClick={() => retryAIAnalysis(startup.id)}
                      disabled={isProcessing}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>

              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className={styles.aiAnalysisSection}>
                  {/* Strategies First */}
                  <div className={styles.strategies}>
                    <h5>📊 Analysis by Strategies</h5>
                    {Object.entries(aiAnalysis.strategies).map(([strategyName, strategy]) => (
                      <div
                        key={strategyName}
                        className={`${styles.strategy} ${styles[`strategy_${strategy.decision.toLowerCase()}`]}`}
                      >
                        <div className={styles.strategyHeader}>
                          <span className={styles.strategyName}>
                            {strategyName === 'conservative'
                              ? '🛡️ Conservative'
                              : strategyName === 'growth'
                                ? '🚀 Aggressive'
                                : '⚖️ Balanced'}
                            {aiAnalysis.recommendation.best_strategy !== 'none' &&
                              strategyName === aiAnalysis.recommendation.best_strategy &&
                              ' ⭐'}
                          </span>
                          <span
                            className={`${styles.decision} ${styles[strategy.decision.toLowerCase()]}`}
                          >
                            {strategy.decision === 'INVEST' ? '✅ INVEST' : '❌ SKIP'}
                          </span>
                        </div>
                        <div className={styles.strategyDetails}>
                          <div className={styles.percentage}>
                            Investment Percentage:{' '}
                            <strong>{strategy.investment_percentage}%</strong>
                          </div>
                          <div className={styles.confidence}>
                            Confidence: <strong>{strategy.confidence_score}%</strong>
                          </div>
                          <p className={styles.reasoning}>{strategy.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation Second */}
                  <div className={styles.recommendation}>
                    <h5>💡 Recommendation</h5>
                    <div className={styles.bestStrategy}>
                      {aiAnalysis.recommendation.best_strategy === 'none' ? (
                        <>
                          Recommendation: <strong>❌ DO NOT INVEST</strong>
                          <span className={styles.confidence}>
                            (confidence: {aiAnalysis.recommendation.overall_confidence}%)
                          </span>
                        </>
                      ) : (
                        <>
                          Best Strategy: <strong>{aiAnalysis.recommendation.best_strategy}</strong>
                          <span className={styles.confidence}>
                            (confidence: {aiAnalysis.recommendation.overall_confidence}%)
                          </span>
                        </>
                      )}
                    </div>
                    <p className={styles.reasoning}>{aiAnalysis.recommendation.reasoning}</p>
                  </div>

                  {/* Detailed Analysis Accordion */}
                  <div className={styles.detailedAnalysisSection}>
                    <h5
                      className={styles.detailedAnalysisHeader}
                      onClick={() => toggleDetailedAnalysis(startup.id)}
                    >
                      🔍 Detailed Analysis
                      <span className={styles.accordionIcon}>
                        {expandedDetailedAnalysis.has(startup.id) ? '▼' : '▶'}
                      </span>
                    </h5>
                    {expandedDetailedAnalysis.has(startup.id) && (
                      <div className={styles.analysisGrid}>
                        <div className={styles.analysisItem}>
                          <strong>Milestone Execution:</strong>
                          <p>{aiAnalysis.unified_analysis.milestone_execution}</p>
                        </div>
                        <div className={styles.analysisItem}>
                          <strong>Scoring:</strong>
                          <p>{aiAnalysis.unified_analysis.scoring_dynamics}</p>
                        </div>
                        <div className={styles.analysisItem}>
                          <strong>Team:</strong>
                          <p>{aiAnalysis.unified_analysis.team_competency}</p>
                        </div>
                        <div className={styles.analysisItem}>
                          <strong>Market:</strong>
                          <p>{aiAnalysis.unified_analysis.market_potential}</p>
                        </div>
                        <div className={styles.analysisItem}>
                          <strong>Risks:</strong>
                          <p>{aiAnalysis.unified_analysis.risk_factors}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
