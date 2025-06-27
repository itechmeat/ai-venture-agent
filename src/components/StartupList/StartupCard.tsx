import React from 'react';
import Image from 'next/image';

import { LoadingSpinner } from '@/components';
import type { StartupWithFullData } from '@/hooks/useStartupAnalysis';

import { ExpertTabs } from './ExpertTabs';
import { AnalysisSection } from './AnalysisSection';
import styles from './StartupList.module.scss';

interface StartupCardProps {
  startupData: StartupWithFullData;
  isProcessing: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onExpertChange: (expertSlug: string) => void;
  onRetry: () => void;
  onRetryExpert?: (expertSlug: string) => void;
}

export function StartupCard({
  startupData,
  isProcessing,
  isExpanded,
  onToggleExpanded,
  onExpertChange,
  onRetry,
  onRetryExpert,
}: StartupCardProps) {
  const {
    startup,
    fullData,
    aiAnalysis,
    activeExpertSlug,
    dataFetchStatus,
    dataFetchMessage,
    processingStatus,
    processingMessage,
  } = startupData;

  const activeExpertAnalysis =
    aiAnalysis?.expert_analyses.find(analysis => analysis.expert_slug === activeExpertSlug) ||
    aiAnalysis?.expert_analyses[0];

  return (
    <div className={styles.card}>
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
          <h3 className={styles.title}>{startup.public_snapshot.name || 'Unnamed Startup'}</h3>
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

        <div className={`${styles.statusIndicator} ${styles[`status_${processingStatus}`]}`}>
          {processingStatus === 'processing' && <LoadingSpinner size="small" />}
          {processingStatus === 'idle' && <span className={styles.statusIcon}>⏳</span>}
          {processingStatus === 'success' && <span className={styles.statusIcon}>✅</span>}
          {processingStatus === 'error' && <span className={styles.statusIcon}>❌</span>}
          <span className={styles.statusText}>{processingMessage}</span>
          {processingStatus === 'error' && fullData && (
            <button className={styles.retryButton} onClick={onRetry} disabled={isProcessing}>
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <div className={styles.aiAnalysisSection}>
          <ExpertTabs
            expertAnalyses={aiAnalysis.expert_analyses}
            activeExpertSlug={activeExpertSlug}
            onExpertChange={onExpertChange}
            onRetryExpert={onRetryExpert}
          />

          {activeExpertAnalysis &&
            activeExpertAnalysis.status === 'completed' &&
            activeExpertAnalysis.analysis && (
            <AnalysisSection
              expertAnalysis={activeExpertAnalysis}
              isExpanded={isExpanded}
              onToggleExpanded={onToggleExpanded}
            />
          )}
        </div>
      )}
    </div>
  );
}
