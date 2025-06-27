import React from 'react';
import Image from 'next/image';

import type { ExpertAnalysisResult } from '@/types/ai';
import investmentExperts from '@/data/investment_experts.json';

import styles from './StartupList.module.scss';

interface ExpertTabsProps {
  expertAnalyses: ExpertAnalysisResult[];
  activeExpertSlug?: string;
  onExpertChange: (expertSlug: string) => void;
}

export function ExpertTabs({ expertAnalyses, activeExpertSlug, onExpertChange }: ExpertTabsProps) {
  return (
    <div className={styles.expertTabs}>
      <h5>👥 Expert Analyses</h5>
      <div className={styles.expertTabsContainer}>
        {expertAnalyses.map(expertAnalysis => {
          const expertData = investmentExperts.find(e => e.slug === expertAnalysis.expert_slug);
          const isActive = expertAnalysis.expert_slug === activeExpertSlug;

          const hasInvestDecision = Object.values(expertAnalysis.analysis.strategies).some(
            strategy => strategy.decision === 'INVEST',
          );
          const bestStrategy = expertAnalysis.analysis.recommendation.best_strategy;
          const recommendsInvestment = bestStrategy !== 'none' && hasInvestDecision;

          return (
            <button
              key={expertAnalysis.expert_slug}
              className={`${styles.expertTab} ${isActive ? styles.active : ''}`}
              onClick={() => onExpertChange(expertAnalysis.expert_slug)}
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
                <div className={styles.expertTabName}>{expertAnalysis.expert_name}</div>
                <div className={styles.expertTabFund}>{expertData?.fund || 'Unknown Fund'}</div>
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
  );
}
