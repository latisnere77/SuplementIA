'use client';

import { useEffect, useState } from 'react';
import IntelligentLoadingSpinner from './IntelligentLoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface EnrichmentData {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface AsyncEnrichmentLoaderProps {
  supplementName: string;
  onComplete: (data: EnrichmentData) => void;
  onError: (error: string) => void;
}

// Constants for polling limits
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 2000; // 2 seconds

// Generate a unique correlation ID for tracking
function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function AsyncEnrichmentLoader({
  supplementName,
  onComplete,
  onError,
}: AsyncEnrichmentLoaderProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'starting' | 'processing' | 'completed' | 'error' | 'timeout'>('starting');
  // Progress tracking reserved for future use
  // const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [correlationId] = useState(generateCorrelationId());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorStatusCode, setErrorStatusCode] = useState<number | null>(null);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Handle retry - generates new job ID
  const handleRetry = async () => {
    try {
      console.log(`🔄 Retrying enrichment for: ${supplementName} (Previous Job ID: ${jobId})`);
      
      // Start new enrichment with previous job ID for retry tracking
      const response = await fetch('/api/portal/enrich-async', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
          'X-Previous-Job-ID': jobId || '', // Pass previous job ID for retry tracking
        },
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
        
        // Check if retry limit exceeded
        if (response.status === 429) {
          setErrorMessage(errorData.message || 'Demasiados intentos. Por favor, espera unos minutos.');
          setErrorStatusCode(429);
          setShowRetryButton(false); // Don't show retry button if limit exceeded
          return;
        }
        
        throw new Error(errorData.error || 'Failed to start retry');
      }

      const data = await response.json();
      console.log(`✅ Retry started - New Job ID: ${data.jobId}`);

      // Reset state with new job ID
      setJobId(data.jobId);
      setStatus('processing');
      // setProgress(0); // Reserved for future use
      setErrorMessage('');
      setErrorStatusCode(null);
      setShowRetryButton(false);
      setRetryCount(0); // Reset consecutive failures counter
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ Failed to start retry:`, err);
      setErrorMessage(err.message || 'No pudimos reintentar la búsqueda.');
      setShowRetryButton(true);
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;
    let consecutiveFailures = 0;

    const startEnrichment = async () => {
      try {
        console.log(`🚀 Starting async enrichment for: ${supplementName} (Correlation ID: ${correlationId})`);

        // Start enrichment
        const response = await fetch('/api/portal/enrich-async', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
          },
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
        let pollCount = 0;
        const maxPolls = 60; // 60 polls * 2s = 2 minutes max

        const poll = async () => {
          if (!isMounted) return;

          pollCount++;
          
          // Calculate exponential backoff delay: 2s, 4s, 8s
          const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, Math.min(consecutiveFailures, 2));
          
          console.log(`🔍 Polling status (${pollCount}/${maxPolls}, retry: ${consecutiveFailures}/${MAX_RETRY_ATTEMPTS}, backoff: ${backoffDelay}ms)...`);

          try {
            const statusResponse = await fetch(pollUrl, {
              headers: {
                'X-Correlation-ID': correlationId,
              },
            });
            
            const statusData = await statusResponse.json();
            const statusCode = statusResponse.status;

            console.log(`📊 Status: ${statusData.status} (HTTP ${statusCode})`);

            // Handle different status codes
            if (statusCode === 200 && statusData.status === 'completed' && statusData.recommendation) {
              console.log(`✅ Enrichment completed!`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('completed');
                // setProgress(100); // Reserved for future use
                consecutiveFailures = 0; // Reset on success
                onComplete(statusData.recommendation);
              }
            } else if (statusCode === 202 && statusData.status === 'processing') {
              // Still processing - update progress
              // Progress tracking reserved for future use
              // const progressPercent = Math.min((pollCount / maxPolls) * 100, 95);
              // if (isMounted) {
              //   setProgress(progressPercent);
              // }
              consecutiveFailures = 0; // Reset on successful poll
              
              // Check if we've exceeded max polls
              if (pollCount >= maxPolls) {
                console.error(`❌ Polling timeout after ${maxPolls} attempts`);
                if (pollInterval) clearInterval(pollInterval);
                if (isMounted) {
                  setStatus('timeout');
                  setErrorMessage('El proceso está tomando más tiempo del esperado. Por favor, intenta de nuevo.');
                  setShowRetryButton(true);
                  onError('Enrichment is taking longer than expected. Please try again.');
                }
              }
            } else if (statusCode === 408) {
              // Request Timeout - show retry button
              console.warn(`⏱️ Request timeout (408)`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('timeout');
                setErrorStatusCode(408);
                setErrorMessage(statusData.message || 'La búsqueda está tomando más tiempo del esperado.');
                setShowRetryButton(true);
                onError(statusData.message || 'Request timeout');
              }
            } else if (statusCode === 410) {
              // Gone - job expired
              console.warn(`🕐 Job expired (410)`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('error');
                setErrorStatusCode(410);
                setErrorMessage(statusData.message || 'El proceso de búsqueda expiró.');
                setShowRetryButton(true);
                onError(statusData.message || 'Job expired');
              }
            } else if (statusCode === 404) {
              // Not Found - job doesn't exist
              console.warn(`❓ Job not found (404)`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('error');
                setErrorStatusCode(404);
                setErrorMessage(statusData.message || 'No encontramos el proceso de búsqueda.');
                setShowRetryButton(true);
                onError(statusData.message || 'Job not found');
              }
            } else if (statusCode === 500 || statusData.status === 'failed') {
              // Server error or failed job
              console.error(`❌ Enrichment failed (${statusCode}):`, statusData.error);
              consecutiveFailures++;
              
              if (consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
                // Stop polling after 3 consecutive failures
                console.error(`❌ Stopping polling after ${MAX_RETRY_ATTEMPTS} consecutive failures`);
                if (pollInterval) clearInterval(pollInterval);
                if (isMounted) {
                  setStatus('error');
                  setErrorStatusCode(statusCode);
                  setErrorMessage(
                    statusData.message || 
                    'Hubo un error al procesar tu búsqueda. Si el problema persiste, por favor contáctanos.'
                  );
                  setRetryCount(consecutiveFailures);
                  onError(statusData.message || 'Enrichment failed after multiple attempts');
                }
              } else {
                // Continue polling with exponential backoff
                if (isMounted) {
                  setRetryCount(consecutiveFailures);
                }
              }
            } else {
              // Unknown status
              console.warn(`⚠️ Unknown status: ${statusData.status} (HTTP ${statusCode})`);
              consecutiveFailures++;
              
              if (consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
                if (pollInterval) clearInterval(pollInterval);
                if (isMounted) {
                  setStatus('error');
                  setErrorMessage('Error inesperado. Por favor, intenta de nuevo.');
                  onError('Unknown error');
                }
              }
            }
          } catch (pollError: unknown) {
            console.error(`❌ Polling error:`, pollError);
            consecutiveFailures++;
            
            // Stop polling after 3 consecutive failures
            if (consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
              console.error(`❌ Stopping polling after ${MAX_RETRY_ATTEMPTS} consecutive failures`);
              if (pollInterval) clearInterval(pollInterval);
              if (isMounted) {
                setStatus('error');
                setErrorMessage('No pudimos verificar el estado de tu búsqueda. Por favor, intenta de nuevo.');
                setRetryCount(consecutiveFailures);
                onError('Failed to check enrichment status after multiple attempts');
              }
            } else {
              // Continue polling with exponential backoff
              if (isMounted) {
                setRetryCount(consecutiveFailures);
              }
            }
          }
        };

        // Start polling immediately
        poll();
        
        // Set up interval with exponential backoff
        const scheduleNextPoll = () => {
          if (!isMounted || !pollInterval) return;
          
          const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, Math.min(consecutiveFailures, 2));
          
          setTimeout(() => {
            if (isMounted) {
              poll();
              scheduleNextPoll();
            }
          }, backoffDelay);
        };
        
        // Use a dummy interval to keep the reference
        pollInterval = setInterval(() => {}, 1000000);
        scheduleNextPoll();

      } catch (error: unknown) {
        console.error(`❌ Failed to start enrichment:`, error);
        const errorMessage = error instanceof Error ? error.message : 'No pudimos iniciar la búsqueda.';
        if (isMounted) {
          setStatus('error');
          setErrorMessage(errorMessage);
          setShowRetryButton(true);
          onError(errorMessage);
        }
      }
    };

    startEnrichment();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [supplementName, onComplete, onError, correlationId]);

  // Show error state with appropriate messages using ErrorMessage component
  if (status === 'error' || status === 'timeout') {
    // Determine suggestion based on error code
    let suggestion: string | undefined;
    if (errorStatusCode === 410) {
      suggestion = 'Intenta buscar de nuevo con un término más específico.';
    } else if (errorStatusCode === 404) {
      suggestion = 'Verifica el enlace o inicia una nueva búsqueda.';
    } else if (errorStatusCode === 408) {
      suggestion = 'Por favor, intenta de nuevo en unos momentos.';
    } else if (errorStatusCode === 429) {
      suggestion = 'Por favor, espera unos segundos antes de intentar de nuevo.';
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <ErrorMessage
          statusCode={errorStatusCode || undefined}
          message={errorMessage || 'Hubo un problema al procesar tu búsqueda.'}
          suggestion={suggestion}
          consecutiveFailures={retryCount}
          onRetry={showRetryButton ? handleRetry : undefined}
          variant="card"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <IntelligentLoadingSpinner 
        supplementName={supplementName}
      />
      
      {/* Show retry count if there have been failures */}
      {retryCount > 0 && retryCount < MAX_RETRY_ATTEMPTS && (
        <div className="text-center">
          <p className="text-sm text-yellow-600">
            Reintentando... ({retryCount}/{MAX_RETRY_ATTEMPTS})
          </p>
        </div>
      )}
    </div>
  );
}
