'use client';

import React, { useState, useCallback } from 'react';

import { ExpertSelector, ExpertSummary } from '@/components';
import { useStartupAnalysis } from '@/hooks';
import type { AvailableModel } from '@/types/ai';
import { AI_MODELS } from '@/types/ai';

import { ProcessingHeader } from './ProcessingHeader';
import { StartupCard } from './StartupCard';
import { EmptyState } from './EmptyState';
import styles from './StartupList.module.scss';

interface StartupListProps {
  className?: string;
}

export function StartupList({ className }: StartupListProps) {
  const showModels = process.env.NEXT_PUBLIC_SHOW_MODELS === 'true';

  const {
    startups,
    startupsWithFullData,
    isLoadingStartups,
    isProcessing,
    currentProcessingIndex,
    error,
    switchActiveExpert,
    retryAIAnalysis,
    retryRagExpert,
    analyzeStartups,
  } = useStartupAnalysis();

  const [expandedDetailedAnalysis, setExpandedDetailedAnalysis] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<AvailableModel>(AI_MODELS.GEMINI_25_FLASH);
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

  const handleAnalyzeStartups = useCallback(() => {
    analyzeStartups(selectedModel, selectedExperts);
  }, [analyzeStartups, selectedModel, selectedExperts]);

  const handleRetryAnalysis = useCallback(
    (startupId: string) => {
      retryAIAnalysis(startupId, selectedModel, selectedExperts);
    },
    [retryAIAnalysis, selectedModel, selectedExperts],
  );

  const handleRetryExpert = useCallback(
    (startupId: string, expertSlug: string) => {
      console.log('handleRetryExpert called with:', { startupId, expertSlug, selectedModel });
      retryRagExpert(startupId, expertSlug, selectedModel);
    },
    [retryRagExpert, selectedModel],
  );

  // Handle empty states
  if (startups.length === 0 && !isLoadingStartups && !error) {
    return (
      <EmptyState
        type="initial"
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyzeStartups}
        isProcessing={isProcessing}
        selectedExperts={selectedExperts}
        onExpertsChange={setSelectedExperts}
        showModels={showModels}
        className={className}
      />
    );
  }

  if (isLoadingStartups) {
    return (
      <EmptyState
        type="loading"
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyzeStartups}
        isProcessing={isProcessing}
        selectedExperts={selectedExperts}
        onExpertsChange={setSelectedExperts}
        showModels={showModels}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        type="error"
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyzeStartups}
        isProcessing={isProcessing}
        selectedExperts={selectedExperts}
        onExpertsChange={setSelectedExperts}
        showModels={showModels}
        error={error}
        className={className}
      />
    );
  }

  if (startups.length === 0) {
    return (
      <EmptyState
        type="empty"
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyzeStartups}
        isProcessing={isProcessing}
        selectedExperts={selectedExperts}
        onExpertsChange={setSelectedExperts}
        showModels={showModels}
        className={className}
      />
    );
  }

  // Main view with startups
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ProcessingHeader
        title={`Found startups: ${startups.length}`}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyzeStartups}
        isProcessing={isProcessing}
        selectedExpertsCount={selectedExperts.length}
        showModels={showModels}
        buttonText={isProcessing ? 'Analyzing...' : 'Re-analyze Startups'}
        currentProcessingIndex={currentProcessingIndex}
        totalItems={startups.length}
      />

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
        {startupsWithFullData.map(startupData => (
          <StartupCard
            key={startupData.startup.id}
            startupData={startupData}
            isProcessing={isProcessing}
            isExpanded={expandedDetailedAnalysis.has(startupData.startup.id)}
            onToggleExpanded={() => toggleDetailedAnalysis(startupData.startup.id)}
            onExpertChange={expertSlug => switchActiveExpert(startupData.startup.id, expertSlug)}
            onRetry={() => handleRetryAnalysis(startupData.startup.id)}
            onRetryExpert={expertSlug => handleRetryExpert(startupData.startup.id, expertSlug)}
          />
        ))}
      </div>
    </div>
  );
}
