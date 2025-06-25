'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/utils';
import styles from './ExpertSelector.module.scss';
import investmentExperts from '@/data/investment_experts.json';
import type { InvestmentExpert } from '@/types';

interface ExpertSelectorProps {
  selectedExperts: string[];
  onExpertsChange: (selectedExperts: string[]) => void;
  disabled?: boolean;
}

export function ExpertSelector({
  selectedExperts,
  onExpertsChange,
  disabled,
}: ExpertSelectorProps) {
  const experts = investmentExperts as InvestmentExpert[];

  const toggleExpert = useCallback(
    (expertSlug: string) => {
      if (disabled) return;

      const newSelection = selectedExperts.includes(expertSlug)
        ? selectedExperts.filter(slug => slug !== expertSlug)
        : [...selectedExperts, expertSlug];

      onExpertsChange(newSelection);
    },
    [selectedExperts, onExpertsChange, disabled],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Select Investment Experts</h3>
        <p>
          Choose experts to analyze startups. Each expert brings unique methodology and insights.
        </p>
      </div>

      <div className={styles.expertsGrid}>
        {experts.map(expert => {
          const isSelected = selectedExperts.includes(expert.slug);

          return (
            <div
              key={expert.slug}
              className={`${styles.expertCard} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
              onClick={() => toggleExpert(expert.slug)}
            >
              <div className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleExpert(expert.slug)}
                  disabled={disabled}
                  className={styles.checkboxInput}
                />
              </div>

              <div className={styles.expertImage}>
                <Image
                  src={`/experts/${expert.slug}.jpg`}
                  alt={expert.name}
                  width={120}
                  height={120}
                  className={styles.avatar}
                />
              </div>

              <div className={styles.expertInfo}>
                <h4 className={styles.name}>{expert.name}</h4>
                <p className={styles.fund}>{expert.fund}</p>
                <div className={styles.price}>{formatPrice(expert.price)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
