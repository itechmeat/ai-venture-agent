import React from 'react';
import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'normal' | 'small';
}

export function LoadingSpinner({ text, size = 'normal' }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size === 'small' ? '0.5rem' : '1rem',
      }}
    >
      <div className={`${styles.spinner} ${size === 'small' ? styles.small : ''}`} />
      {text && (
        <span
          style={{
            fontSize: size === 'small' ? '0.75rem' : '0.875rem',
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
