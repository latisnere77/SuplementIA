'use client';

import { useEffect, useState } from 'react';
import IntelligentLoadingSpinner from './IntelligentLoadingSpinner';

interface AsyncEnrichmentLoaderProps {
  supplementName: string;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

export default function AsyncEnrichmentLoader({
  supplementName,
  onComplete,
  onError,
}: AsyncEnrichmentLoaderProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'starting' | 'processing' | 'completed' | 'error'>('starting');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const startEnrichment = async () => {
      try {
        console.log(`🚀 Starting async enrichment for: ${supplementName}`);

        // Start enrichment
        const response = await fetch('/api/portal/enrich-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplementName,
            maxStudies: 10,
            rctOnly: false,
            yearFrom: 2010,
            yearTo: new Date().getFullYear(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start enrichment');
        }

        const data = await response.json();
        console.log(`✅ Enrichment started - Job ID: ${data.jobId}`);

        if (isMounted) {
          setJobId(data.jobId);
          setStatus('processing');
        }

        // Start polling
        const pollUrl = data.pollUrl;
        const pollIntervalMs = data.pollInterval || 2000;

        let pollCount = 0;
        const maxPolls = 60; // 60 polls * 2s = 2 minutes max

        const poll = async () => {
          if (!isMounted) return;

          pollCount++;
          console.log(`🔍 Polling status (${pollCount}/${maxPolls})...`);

          try {
            const statusResponse = await fetch(pollUrl);
            const statusData = await statusResponse.json();

            console.log(`📊 Status:`, statusData.status);

            if (statusData.status === 'completed' && statusData.data) {
              console.log(`✅ Enrichment completed!`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('completed');
                setProgress(100);
                onComplete(statusData.data);
              }
            } else if (statusData.status === 'error') {
              console.error(`❌ Enrichment failed:`, statusData.error);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('error');
                onError(statusData.error || 'Enrichment failed');
              }
            } else if (statusData.status === 'processing') {
              // Update progress based on time elapsed
              const progressPercent = Math.min((pollCount / maxPolls) * 100, 95);
              if (isMounted) {
                setProgress(progressPercent);
              }

              // Check if we've exceeded max polls
              if (pollCount >= maxPolls) {
                console.error(`❌ Polling timeout after ${maxPolls} attempts`);
                if (pollInterval) clearInterval(pollInterval);
                if (isMounted) {
                  setStatus('error');
                  onError('Enrichment is taking longer than expected. Please try again.');
                }
              }
            }
          } catch (pollError: any) {
            console.error(`❌ Polling error:`, pollError);
            // Don't stop polling on transient errors
            // Only stop if we've exceeded max polls
            if (pollCount >= maxPolls) {
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('error');
                onError('Failed to check enrichment status');
              }
            }
          }
        };

        // Start polling immediately, then every interval
        poll();
        pollInterval = setInterval(poll, pollIntervalMs);

      } catch (error: any) {
        console.error(`❌ Failed to start enrichment:`, error);
        if (isMounted) {
          setStatus('error');
          onError(error.message || 'Failed to start enrichment');
        }
      }
    };

    startEnrichment();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [supplementName, onComplete, onError]);

  return (
    <IntelligentLoadingSpinner 
      supplementName={supplementName}
    />
  );
}
