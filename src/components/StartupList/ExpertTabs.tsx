import React from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components';

import type { ExpertAnalysisResult } from '@/types/ai';
import investmentExperts from '@/data/investment_experts.json';

import styles from './StartupList.module.scss';

interface ExpertTabsProps {
  expertAnalyses: ExpertAnalysisResult[];
  activeExpertSlug?: string;
  onExpertChange: (expertSlug: string) => void;
  onRetryExpert?: (expertSlug: string) => void;
}

export function ExpertTabs({
  expertAnalyses,
  activeExpertSlug,
  onExpertChange,
  onRetryExpert,
}: ExpertTabsProps) {
  const getStatusIcon = (expertAnalysis: ExpertAnalysisResult): React.ReactNode => {
    switch (expertAnalysis.status) {
      case 'pending':
      case 'loading':
        return <LoadingSpinner size="small" />;
      case 'error':
        return '❌';
      case 'completed':
      default:
        if (!expertAnalysis.analysis) return <LoadingSpinner size="small" />;
        const hasInvestDecision = Object.values(expertAnalysis.analysis.strategies).some(
          strategy => strategy.decision === 'INVEST',
        );
        const bestStrategy = expertAnalysis.analysis.recommendation.best_strategy;
        const recommendsInvestment = bestStrategy !== 'none' && hasInvestDecision;
        return recommendsInvestment ? '✓' : '✗';
    }
  };


  return (
    <div className={styles.expertTabs}>
      <h5>👥 Expert Analyses</h5>
      <div className={styles.expertTabsContainer}>
        {expertAnalyses.map(expertAnalysis => {
          const expertData = investmentExperts.find(e => e.slug === expertAnalysis.expert_slug);
          const isActive = expertAnalysis.expert_slug === activeExpertSlug;
          const isClickable = expertAnalysis.status === 'completed' && expertAnalysis.analysis;

          return (
            <div
              key={expertAnalysis.expert_slug}
              className={`${styles.expertTab} ${isActive ? styles.active : ''}`}
              onClick={() => isClickable && onExpertChange(expertAnalysis.expert_slug)}
              title={
                expertAnalysis.error ||
                (expertAnalysis.status === 'pending'
                  ? 'Analysis pending'
                  : expertAnalysis.status === 'loading'
                    ? 'Analysis in progress'
                    : '')
              }
            >
              <div className={styles.expertTabPhoto}>
                <Image
                  src={expertData?.photo || `/experts/${expertAnalysis.expert_slug}.jpg`}
                  alt={expertAnalysis.expert_name}
                  width={32}
                  height={32}
                />
              </div>
              <div className={styles.expertTabInfo}>
                <div className={styles.expertTabName}>{expertAnalysis.expert_name}</div>
                <div className={styles.expertTabFund}>{expertData?.fund || 'Unknown Fund'}</div>
              </div>
              <div style={{border: 'none', outline: 'none', boxShadow: 'none', background: 'none'}}>
                {expertAnalysis.status === 'error' && onRetryExpert ? (
                  <div onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('=== RETRY CLICKED ===');
                    if (onRetryExpert) {
                      onRetryExpert(expertAnalysis.expert_slug);
                    }
                  }}>
                    🔄
                  </div>
                ) : (
                  getStatusIcon(expertAnalysis)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
