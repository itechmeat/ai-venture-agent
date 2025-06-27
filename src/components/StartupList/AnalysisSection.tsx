import React from 'react';

import type { ExpertAnalysisResult } from '@/types/ai';

import styles from './StartupList.module.scss';

interface AnalysisSectionProps {
  expertAnalysis: ExpertAnalysisResult;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function AnalysisSection({
  expertAnalysis,
  isExpanded,
  onToggleExpanded,
}: AnalysisSectionProps) {
  return (
    <>
      <div className={styles.strategies}>
        <h5>📊 Analysis by Strategies</h5>
        {Object.entries(expertAnalysis.analysis.strategies).map(([strategyName, strategy]) => (
          <div
            key={strategyName}
            className={`${styles.strategy} ${styles[`strategy_${strategy.decision.toLowerCase()}`]}`}
          >
            <div className={styles.strategyHeader}>
              <span className={styles.strategyName}>
                {strategyName === 'conservative'
                  ? '🛡️ Conservative'
                  : strategyName === 'growth'
                    ? '🚀 Aggressive'
                    : '⚖️ Balanced'}
                {expertAnalysis.analysis.recommendation.best_strategy !== 'none' &&
                  strategyName === expertAnalysis.analysis.recommendation.best_strategy &&
                  ' ⭐'}
              </span>
              <span className={`${styles.decision} ${styles[strategy.decision.toLowerCase()]}`}>
                {strategy.decision === 'INVEST' ? '✅ INVEST' : '❌ SKIP'}
              </span>
            </div>
            <div className={styles.strategyDetails}>
              <div className={styles.percentage}>
                Investment Percentage: <strong>{strategy.investment_percentage}%</strong>
              </div>
              <div className={styles.confidence}>
                Confidence: <strong>{strategy.confidence_score}%</strong>
              </div>
              <p className={styles.reasoning}>{strategy.reasoning}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className={styles.recommendation}>
        <h5>💡 Recommendation</h5>
        <div className={styles.bestStrategy}>
          {expertAnalysis.analysis.recommendation.best_strategy === 'none' ? (
            <>
              Recommendation: <strong>❌ DO NOT INVEST</strong>
              <span className={styles.confidence}>
                (confidence: {expertAnalysis.analysis.recommendation.overall_confidence}%)
              </span>
            </>
          ) : (
            <>
              Best Strategy: <strong>{expertAnalysis.analysis.recommendation.best_strategy}</strong>
              <span className={styles.confidence}>
                (confidence: {expertAnalysis.analysis.recommendation.overall_confidence}%)
              </span>
            </>
          )}
        </div>
        <p className={styles.reasoning}>{expertAnalysis.analysis.recommendation.reasoning}</p>
      </div>

      {/* Detailed Analysis Accordion */}
      <div className={styles.detailedAnalysisSection}>
        <h5 className={styles.detailedAnalysisHeader} onClick={onToggleExpanded}>
          🔍 Detailed Analysis
          <span className={styles.accordionIcon}>{isExpanded ? '▼' : '▶'}</span>
        </h5>
        {isExpanded && (
          <div className={styles.analysisGrid}>
            <div className={styles.analysisItem}>
              <strong>Milestone Execution:</strong>
              <p>{expertAnalysis.analysis.unified_analysis.milestone_execution}</p>
            </div>
            <div className={styles.analysisItem}>
              <strong>Scoring:</strong>
              <p>{expertAnalysis.analysis.unified_analysis.scoring_dynamics}</p>
            </div>
            <div className={styles.analysisItem}>
              <strong>Team:</strong>
              <p>{expertAnalysis.analysis.unified_analysis.team_competency}</p>
            </div>
            <div className={styles.analysisItem}>
              <strong>Market:</strong>
              <p>{expertAnalysis.analysis.unified_analysis.market_potential}</p>
            </div>
            <div className={styles.analysisItem}>
              <strong>Risks:</strong>
              <p>{expertAnalysis.analysis.unified_analysis.risk_factors}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
