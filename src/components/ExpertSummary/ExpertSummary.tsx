'use client';

import React from 'react';
import { formatPrice } from '@/utils';
import styles from './ExpertSummary.module.scss';
import investmentExperts from '@/data/investment_experts.json';
import type { InvestmentExpert } from '@/types';

interface ExpertSummaryProps {
  selectedExperts: string[];
}

export function ExpertSummary({ selectedExperts }: ExpertSummaryProps) {
  const experts = investmentExperts as InvestmentExpert[];

  const totalCost = experts
    .filter(expert => selectedExperts.includes(expert.slug))
    .reduce((sum, expert) => sum + expert.price, 0);

  if (selectedExperts.length === 0) {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryContent}>
          <span className={styles.noSelection}>No experts selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.summary}>
      <div className={styles.summaryContent}>
        <span className={styles.selectedCount}>
          {selectedExperts.length} expert{selectedExperts.length > 1 ? 's' : ''} selected
        </span>
        <span className={styles.totalCost}>Total: {formatPrice(totalCost)}</span>
      </div>
    </div>
  );
}
