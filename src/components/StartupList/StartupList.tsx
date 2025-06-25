'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components';
import { Startup, FullStartupAPIResponse, StartupListResponse } from '@/types';
import styles from './StartupList.module.scss';

interface StartupListProps {
  className?: string;
}

interface StartupWithFullData {
  startup: Startup;
  fullData?: FullStartupAPIResponse['data']['data'];
  isLoadingFull: boolean;
}

interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime: number;
    totalProjects: number;
  };
}

export function StartupList({ className }: StartupListProps) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsWithFullData, setStartupsWithFullData] = useState<StartupWithFullData[]>([]);
  const [isLoadingStartups, setIsLoadingStartups] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStartups = useCallback(async () => {
    setIsLoadingStartups(true);
    setError(null);

    try {
      const response = await fetch('/api/startups');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse: APIResponse<StartupListResponse['data']> = await response.json();

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API returned unsuccessful response');
      }

      // Extract the projects array from the response
      const projects: Startup[] = apiResponse.data?.projects || [];
      setStartups(projects);
      return projects;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching startups:', error);
      return null;
    } finally {
      setIsLoadingStartups(false);
    }
  }, []);

  const fetchFullData = useCallback(async (startupId: string) => {
    setStartupsWithFullData(prev =>
      prev.map(item => (item.startup.id === startupId ? { ...item, isLoadingFull: true } : item)),
    );

    try {
      const response = await fetch(`/api/startups/${startupId}/full`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: FullStartupAPIResponse = await response.json();

      if (result.success && result.data.success) {
        setStartupsWithFullData(prev =>
          prev.map(item =>
            item.startup.id === startupId
              ? { ...item, fullData: result.data.data, isLoadingFull: false }
              : item,
          ),
        );
      } else {
        throw new Error('Failed to fetch full startup data');
      }
    } catch (error) {
      console.error('Error fetching full startup data:', error);
      setStartupsWithFullData(prev =>
        prev.map(item =>
          item.startup.id === startupId ? { ...item, isLoadingFull: false } : item,
        ),
      );
    }
  }, []);

  const analyzeStartups = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    // First, fetch the list of startups
    const startupsData = await fetchStartups();
    if (!startupsData) {
      setIsProcessing(false);
      return;
    }

    // Initialize startups with full data structure
    const initialData: StartupWithFullData[] = startupsData.map(startup => ({
      startup,
      fullData: undefined,
      isLoadingFull: false,
    }));
    setStartupsWithFullData(initialData);

    // Process each startup sequentially to get full data
    for (const startup of startupsData) {
      await fetchFullData(startup.id);
      // Add a small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  }, [fetchStartups, fetchFullData, isProcessing]);

  // Show initial state with button
  if (startups.length === 0 && !isLoadingStartups && !error) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingStartups) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>Loading startups...</h2>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
        <div className={styles.error}>Error loading startups: {error}</div>
      </div>
    );
  }

  if (startups.length === 0) {
    return (
      <div className={`${styles.container} ${styles.centered} ${className || ''}`}>
        <div className={styles.header}>
          <h2>AI Venture Agent</h2>
          <button
            onClick={analyzeStartups}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze Startups'}
          </button>
        </div>
        <div className={styles.empty}>No startups found</div>
      </div>
    );
  }

  const displayData =
    startupsWithFullData.length > 0
      ? startupsWithFullData
      : startups.map(startup => ({ startup, fullData: undefined, isLoadingFull: false }));

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h2>Found startups: {startups.length}</h2>
        <button onClick={analyzeStartups} disabled={isProcessing} className={styles.processButton}>
          {isProcessing ? 'Analyzing...' : 'Re-analyze Startups'}
        </button>
      </div>

      <div className={styles.grid}>
        {displayData.map(({ startup, fullData, isLoadingFull }) => (
          <div key={startup.id} className={styles.card}>
            {/* Loading overlay */}
            {isLoadingFull && (
              <div className={styles.loadingOverlay}>
                <LoadingSpinner />
                <span>Loading full data...</span>
              </div>
            )}

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
                <h3 className={styles.title}>
                  {startup.public_snapshot.name || 'Unnamed Startup'}
                </h3>
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

            {/* Full data display */}
            {fullData && (
              <div className={styles.fullDataSection}>
                <h4>Full Data (JSON):</h4>
                <pre className={styles.jsonDisplay}>{JSON.stringify(fullData, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
