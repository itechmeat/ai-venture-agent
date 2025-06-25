'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { LoadingSpinner, ExpertSelector, ExpertSummary } from '@/components';
import { APIClient } from '@/utils/api';
import type { APIResponse } from '@/lib/api/base-handler';
import styles from './StartupList.module.scss';
import investmentExperts from '@/data/investment_experts.json';
import type { Startup, FullStartupAPIResponse, StartupListResponse } from '@/types';
import type { MultiExpertAnalysisResult, AvailableModel } from '@/types/ai';
import { AI_MODELS, AVAILABLE_MODELS, MODEL_DISPLAY_NAMES } from '@/types/ai';

interface StartupListProps {
  className?: string;
}

type DataFetchStatus = 'idle' | 'fetching' | 'success' | 'error';
type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

interface StartupWithFullData {
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

export function StartupList({ className }: StartupListProps) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsWithFullData, setStartupsWithFullData] = useState<StartupWithFullData[]>([]);
  const [isLoadingStartups, setIsLoadingStartups] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [expandedDetailedAnalysis, setExpandedDetailedAnalysis] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<AvailableModel>(AI_MODELS.GEMINI_FLASH);
  const [selectedExperts, setSelectedExperts] = useState<string[]>(['junior-manager']);

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
              activeExpertSlug: firstExpertSlug, // устанавливаем первого эксперта как активного
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
    [updateStartupData, selectedModel, selectedExperts],
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
    [startupsWithFullData, updateStartupData, selectedModel, selectedExperts],
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
            disabled={isProcessing || selectedExperts.length === 0}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>

        {!isProcessing && (
          <>
            <ExpertSummary selectedExperts={selectedExperts} />

            <ExpertSelector
              selectedExperts={selectedExperts}
              onExpertsChange={setSelectedExperts}
              disabled={isProcessing}
            />
          </>
        )}
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
            disabled={isProcessing || selectedExperts.length === 0}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>

        {!isProcessing && (
          <>
            <ExpertSummary selectedExperts={selectedExperts} />

            <ExpertSelector
              selectedExperts={selectedExperts}
              onExpertsChange={setSelectedExperts}
              disabled={isProcessing}
            />
          </>
        )}

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
            disabled={isProcessing || selectedExperts.length === 0}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>

        {!isProcessing && (
          <>
            <ExpertSummary selectedExperts={selectedExperts} />

            <ExpertSelector
              selectedExperts={selectedExperts}
              onExpertsChange={setSelectedExperts}
              disabled={isProcessing}
            />
          </>
        )}

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
        <button
          onClick={analyzeStartups}
          disabled={isProcessing || selectedExperts.length === 0}
          className={styles.processButton}
        >
          {isProcessing ? 'Analyzing...' : 'Re-analyze Startups'}
        </button>
      </div>

      {!isProcessing && !startupsWithFullData.some(s => s.aiAnalysis) && (
        <>
          <ExpertSummary selectedExperts={selectedExperts} />

          <ExpertSelector
            selectedExperts={selectedExperts}
            onExpertsChange={setSelectedExperts}
            disabled={isProcessing}
          />
        </>
      )}

      <div className={styles.grid}>
        {startupsWithFullData.map(
          ({
            startup,
            fullData,
            aiAnalysis,
            activeExpertSlug,
            dataFetchStatus,
            dataFetchMessage,
            processingStatus,
            processingMessage,
          }) => {
            const activeExpertAnalysis =
              aiAnalysis?.expert_analyses.find(
                analysis => analysis.expert_slug === activeExpertSlug,
              ) || aiAnalysis?.expert_analyses[0]; // Fallback to first expert

            return (
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
                  <div
                    className={`${styles.statusIndicator} ${styles[`status_${dataFetchStatus}`]}`}
                  >
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
                    {processingStatus === 'success' && (
                      <span className={styles.statusIcon}>✅</span>
                    )}
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
                    {/* Expert Selector */}
                    <div className={styles.expertTabs}>
                      <h5>👥 Expert Analyses</h5>
                      <div className={styles.expertTabsContainer}>
                        {aiAnalysis.expert_analyses.map(expertAnalysis => {
                          const expertData = investmentExperts.find(
                            e => e.slug === expertAnalysis.expert_slug,
                          );
                          const isActive = expertAnalysis.expert_slug === activeExpertSlug;

                          const hasInvestDecision = Object.values(
                            expertAnalysis.analysis.strategies,
                          ).some(strategy => strategy.decision === 'INVEST');
                          const bestStrategy = expertAnalysis.analysis.recommendation.best_strategy;
                          const recommendsInvestment = bestStrategy !== 'none' && hasInvestDecision;

                          return (
                            <button
                              key={expertAnalysis.expert_slug}
                              className={`${styles.expertTab} ${isActive ? styles.active : ''}`}
                              onClick={() =>
                                switchActiveExpert(startup.id, expertAnalysis.expert_slug)
                              }
                            >
                              <div className={styles.expertTabPhoto}>
                                <Image
                                  src={`/experts/${expertAnalysis.expert_slug}.jpg`}
                                  alt={expertAnalysis.expert_name}
                                  width={32}
                                  height={32}
                                />
                              </div>
                              <div className={styles.expertTabInfo}>
                                <div className={styles.expertTabName}>
                                  {expertAnalysis.expert_name}
                                </div>
                                <div className={styles.expertTabFund}>
                                  {expertData?.fund || 'Unknown Fund'}
                                </div>
                              </div>
                              <div
                                className={`${styles.expertTabRecommendation} ${recommendsInvestment ? styles.invest : styles.pass}`}
                              >
                                {recommendsInvestment ? '✓' : '✗'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Expert Analysis */}
                    {activeExpertAnalysis && (
                      <>
                        {/* Strategies First */}
                        <div className={styles.strategies}>
                          <h5>📊 Analysis by Strategies</h5>
                          {Object.entries(activeExpertAnalysis.analysis.strategies).map(
                            ([strategyName, strategy]) => (
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
                                    {activeExpertAnalysis.analysis.recommendation.best_strategy !==
                                      'none' &&
                                      strategyName ===
                                        activeExpertAnalysis.analysis.recommendation
                                          .best_strategy &&
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
                            ),
                          )}
                        </div>

                        {/* Recommendation Second */}
                        <div className={styles.recommendation}>
                          <h5>💡 Recommendation</h5>
                          <div className={styles.bestStrategy}>
                            {activeExpertAnalysis.analysis.recommendation.best_strategy ===
                            'none' ? (
                              <>
                                Recommendation: <strong>❌ DO NOT INVEST</strong>
                                <span className={styles.confidence}>
                                  (confidence:{' '}
                                  {activeExpertAnalysis.analysis.recommendation.overall_confidence}
                                  %)
                                </span>
                              </>
                            ) : (
                              <>
                                Best Strategy:{' '}
                                <strong>
                                  {activeExpertAnalysis.analysis.recommendation.best_strategy}
                                </strong>
                                <span className={styles.confidence}>
                                  (confidence:{' '}
                                  {activeExpertAnalysis.analysis.recommendation.overall_confidence}
                                  %)
                                </span>
                              </>
                            )}
                          </div>
                          <p className={styles.reasoning}>
                            {activeExpertAnalysis.analysis.recommendation.reasoning}
                          </p>
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
                                <p>
                                  {
                                    activeExpertAnalysis.analysis.unified_analysis
                                      .milestone_execution
                                  }
                                </p>
                              </div>
                              <div className={styles.analysisItem}>
                                <strong>Scoring:</strong>
                                <p>
                                  {activeExpertAnalysis.analysis.unified_analysis.scoring_dynamics}
                                </p>
                              </div>
                              <div className={styles.analysisItem}>
                                <strong>Team:</strong>
                                <p>
                                  {activeExpertAnalysis.analysis.unified_analysis.team_competency}
                                </p>
                              </div>
                              <div className={styles.analysisItem}>
                                <strong>Market:</strong>
                                <p>
                                  {activeExpertAnalysis.analysis.unified_analysis.market_potential}
                                </p>
                              </div>
                              <div className={styles.analysisItem}>
                                <strong>Risks:</strong>
                                <p>{activeExpertAnalysis.analysis.unified_analysis.risk_factors}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
