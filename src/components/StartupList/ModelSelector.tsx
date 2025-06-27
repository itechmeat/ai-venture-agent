import React from 'react';

import type { AvailableModel } from '@/types/ai';
import { AVAILABLE_MODELS, MODEL_DISPLAY_NAMES } from '@/types/ai';

import styles from './StartupList.module.scss';

interface ModelSelectorProps {
  selectedModel: AvailableModel;
  onModelChange: (model: AvailableModel) => void;
  disabled?: boolean;
  show?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  show = true,
}: ModelSelectorProps) {
  if (!show) return null;

  return (
    <div className={styles.modelSelector}>
      <label htmlFor="model-select">AI Model:</label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={e => onModelChange(e.target.value as AvailableModel)}
        disabled={disabled}
        className={styles.modelSelect}
      >
        {AVAILABLE_MODELS.map(model => (
          <option key={model} value={model}>
            {MODEL_DISPLAY_NAMES[model]}
          </option>
        ))}
      </select>
    </div>
  );
}
