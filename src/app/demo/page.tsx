import React from 'react';
import Image from 'next/image';

import styles from './page.module.scss';

export default function DemoPage() {
  return (
    <main className={styles.main}>
      <div className={styles.starfield}></div>
      <div className={styles.content}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <Image
              src="/logo.svg"
              alt="AI Venture Agent Logo"
              width={200}
              height={118}
              className={styles.logo}
              priority
            />
          </div>

          <h1 className={styles.title}>AI Venture Agent</h1>

          <p className={styles.slogan}>Autonomous investment decisions for venture funds</p>
        </div>
      </div>
    </main>
  );
}
