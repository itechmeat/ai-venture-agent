import React from 'react';
import styles from './LoadingSpinner.module.scss';

export interface LoadingSpinnerProps {
  text?: string;
  size?: 'normal' | 'small';
}

export function LoadingSpinner({ text, size = 'normal' }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.spinnerContainer} ${size === 'small' ? styles.small : ''}`}>
      <div className={`${styles.spinner} ${size === 'small' ? styles.small : ''}`} />
      {text && (
        <span className={`${styles.spinnerText} ${size === 'small' ? styles.small : ''}`}>
          {text}
        </span>
      )}
    </div>
  );
}
