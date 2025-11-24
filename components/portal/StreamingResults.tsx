/**
 * Streaming Results Component
 * 
 * Handles Server-Sent Events for real-time progress updates
 * Provides progressive content delivery and better UX
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Search, 
  FileText, 
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface StreamingResultsProps {
  supplementName: string;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

type Stage = 'idle' | 'expansion' | 'studies' | 'generation' | 'complete' | 'error';

interface StageInfo {
  stage: Stage;
  message: string;
  progress: number;
  icon: any;
  color: string;
}

const STAGES: Record<Stage, StageInfo> = {
  idle: {
    stage: 'idle',
    message: 'Initializing...',
    progress: 0,
    icon: Loader2,
    color: 'text-gray-500',
  },
  expansion: {
    stage: 'expansion',
    message: 'Analyzing search term...',
    progress: 10,
    icon: Search,
    color: 'text-blue-500',
  },
  studies: {
    stage: 'studies',
    message: 'Searching PubMed database...',
    progress: 30,
    icon: FileText,
    color: 'text-purple-500',
  },
  generation: {
    stage: 'generation',
    message: 'Analyzing evidence...',
    progress: 60,
    icon: Sparkles,
    color: 'text-green-500',
  },
  complete: {
    stage: 'complete',
    message: 'Complete!',
    progress: 100,
    icon: CheckCircle,
    color: 'text-green-600',
  },
  error: {
    stage: 'error',
    message: 'Error occurred',
    progress: 0,
    icon: AlertCircle,
    color: 'text-red-500',
  },
};

export function StreamingResults({ supplementName, onComplete, onError }: StreamingResultsProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [expansion, setExpansion] = useState<any>(null);
  const [studiesCount, setStudiesCount] = useState(0);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleStream = useCallback(async () => {
    try {
      const eventSource = new EventSource(
        `/api/portal/enrich-stream?supplement=${encodeURIComponent(supplementName)}`
      );

      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data);
        console.log('Stream started:', data);
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        setStage(data.stage);
        setProgress(data.progress);
      });

      eventSource.addEventListener('expansion', (e) => {
        const data = JSON.parse(e.data);
        setExpansion(data);
        setProgress(25);
      });

      eventSource.addEventListener('studies', (e) => {
        const data = JSON.parse(e.data);
        setStudiesCount(data.count);
        setProgress(50);
      });

      eventSource.addEventListener('content', (e) => {
        const data = JSON.parse(e.data);
        setContent(data);
        setProgress(90);
      });

      eventSource.addEventListener('complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setStage('complete');
        setProgress(100);
        eventSource.close();
        onComplete?.(content);
      });

      eventSource.addEventListener('error', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setStage('error');
        setError(data.message);
        eventSource.close();
        onError?.(data.message);
      });

      eventSource.onerror = () => {
        setStage('error');
        setError('Connection lost');
        eventSource.close();
        onError?.('Connection lost');
      };

    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
      onError?.(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [supplementName, onComplete, onError, content]);

  useEffect(() => {
    handleStream();
  }, [handleStream]);

  const currentStage = STAGES[stage];
  const Icon = currentStage.icon;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Stage Indicator */}
            <div className="flex items-center gap-3">
              <div className={`${currentStage.color}`}>
                <Icon className={`w-6 h-6 ${stage === 'idle' || stage === 'expansion' || stage === 'studies' || stage === 'generation' ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{currentStage.message}</p>
                <p className="text-xs text-muted-foreground">
                  {(elapsedTime / 1000).toFixed(1)}s elapsed
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2" />

            {/* Stage Pills */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={stage === 'expansion' || stage === 'studies' || stage === 'generation' || stage === 'complete' ? 'default' : 'outline'}>
                <Search className="w-3 h-3 mr-1" />
                Expansion
              </Badge>
              <Badge variant={stage === 'studies' || stage === 'generation' || stage === 'complete' ? 'default' : 'outline'}>
                <FileText className="w-3 h-3 mr-1" />
                Studies
              </Badge>
              <Badge variant={stage === 'generation' || stage === 'complete' ? 'default' : 'outline'}>
                <Sparkles className="w-3 h-3 mr-1" />
                Generation
              </Badge>
              <Badge variant={stage === 'complete' ? 'default' : 'outline'}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expansion Results */}
      <AnimatePresence>
        {expansion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Terms</CardTitle>
                <CardDescription>
                  Found {expansion.alternatives.length} search variation{expansion.alternatives.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expansion.alternatives.map((term: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {term}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Studies Count */}
      <AnimatePresence>
        {studiesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {studiesCount}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scientific studies found
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Preview */}
      <AnimatePresence>
        {content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Name & Description */}
            {content.whatIsIt && (
              <Card>
                <CardHeader>
                  <CardTitle>{supplementName}</CardTitle>
                  <CardDescription>{content.whatIsIt}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Primary Uses */}
            {content.primaryUses && content.primaryUses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Primary Uses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {content.primaryUses.map((use: string, i: number) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{use}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Dosage */}
            {content.dosage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recommended Dosage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Standard:</strong> {content.dosage.standard}</p>
                    {content.dosage.duration && (
                      <p><strong>Duration:</strong> {content.dosage.duration}</p>
                    )}
                    {content.dosage.timing && (
                      <p><strong>Timing:</strong> {content.dosage.timing}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-2">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
