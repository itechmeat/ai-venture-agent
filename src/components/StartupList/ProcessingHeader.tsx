import React from 'react';

import type { AvailableModel } from '@/types/ai';

import { ModelSelector } from './ModelSelector';
import styles from './StartupList.module.scss';

interface ProcessingHeaderProps {
  title: string;
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  onAnalyze: () => void;
  isProcessing: boolean;
  selectedExpertsCount: number;
  showModels?: boolean;
  buttonText?: string;
  currentProcessingIndex?: number;
  totalItems?: number;
}

export function ProcessingHeader({
  title,
  selectedModel,
  onModelChange,
  onAnalyze,
  isProcessing,
  selectedExpertsCount,
  showModels = true,
  buttonText,
  currentProcessingIndex,
  totalItems,
}: ProcessingHeaderProps) {
  const getButtonText = () => {
    if (buttonText) return buttonText;
    return isProcessing ? 'Analyzing...' : 'Analyze Startups';
  };

  return (
    <div className={styles.header}>
      <h2>{title}</h2>

      {isProcessing &&
        currentProcessingIndex !== undefined &&
        totalItems !== undefined &&
        currentProcessingIndex >= 0 && (
          <div className={styles.progressInfo}>
            Processing: {currentProcessingIndex + 1} / {totalItems}
          </div>
        )}

      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        disabled={isProcessing}
        show={showModels}
      />

      <button
        onClick={onAnalyze}
        disabled={isProcessing || selectedExpertsCount === 0}
        className={styles.processButton}
      >
        {getButtonText()}
      </button>
    </div>
  );
}
