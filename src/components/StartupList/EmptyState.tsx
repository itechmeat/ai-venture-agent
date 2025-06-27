import React from 'react';

import { LoadingSpinner, ExpertSelector, ExpertSummary } from '@/components';
import type { AvailableModel } from '@/types/ai';

import { ProcessingHeader } from './ProcessingHeader';
import styles from './StartupList.module.scss';

interface EmptyStateProps {
  type: 'initial' | 'loading' | 'error' | 'empty';
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  onAnalyze: () => void;
  isProcessing: boolean;
  selectedExperts: string[];
  onExpertsChange: (experts: string[]) => void;
  showModels?: boolean;
  error?: string | null;
  className?: string;
}

export function EmptyState({
  type,
  selectedModel,
  onModelChange,
  onAnalyze,
  isProcessing,
  selectedExperts,
  onExpertsChange,
  showModels = true,
  error,
  className,
}: EmptyStateProps) {
  const getTitle = () => {
    switch (type) {
      case 'loading':
        return 'Loading startups...';
      case 'error':
        return 'AI Venture Agent';
      case 'empty':
        return 'AI Venture Agent';
      default:
        return 'AI Venture Agent';
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'error':
      case 'empty':
        return isProcessing ? 'Analyzing...' : 'Analyze Startups';
      default:
        return isProcessing ? 'Analyzing...' : 'Analyze Startups';
    }
  };

  return (
    <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
      <ProcessingHeader
        title={getTitle()}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onAnalyze={onAnalyze}
        isProcessing={isProcessing}
        selectedExpertsCount={selectedExperts.length}
        showModels={showModels}
        buttonText={getButtonText()}
      />

      {type === 'loading' && <LoadingSpinner />}

      {!isProcessing && type !== 'loading' && (
        <>
          <ExpertSummary selectedExperts={selectedExperts} />
          <ExpertSelector
            selectedExperts={selectedExperts}
            onExpertsChange={onExpertsChange}
            disabled={isProcessing}
          />
        </>
      )}

      {type === 'error' && error && (
        <div className={styles.error}>Error loading startups: {error}</div>
      )}

      {type === 'empty' && <div className={styles.empty}>No startups found</div>}
    </div>
  );
}
