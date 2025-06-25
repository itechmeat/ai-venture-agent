import React from 'react';
import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <div className={styles.spinner} />
      {text && (
        <span
          style={{
            fontSize: '0.875rem',
            color: '#64ffda',
            fontWeight: 500,
            textShadow: '0 0 10px rgba(100, 255, 218, 0.5)',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}
