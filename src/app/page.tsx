'use client';

import React from 'react';
import { StartupList } from '@/components';
import styles from './page.module.scss';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.starfield} />

      <div className={styles.content}>
        <StartupList />
      </div>
    </main>
  );
}
