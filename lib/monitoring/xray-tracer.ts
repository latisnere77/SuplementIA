/**
 * X-Ray Tracer
 * AWS X-Ray integration for distributed tracing
 * Tracks requests across Lambda, API Gateway, and other AWS services
 */

export interface TraceSegment {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  subsegments?: TraceSegment[];
  metadata?: Record<string, any>;
  annotations?: Record<string, string | number | boolean>;
  error?: boolean;
  fault?: boolean;
}

export interface TraceContext {
  traceId: string;
  segmentId: string;
  parentId?: string;
}

class XRayTracer {
  private currentSegment: TraceSegment | null = null;
  private segments: Map<string, TraceSegment> = new Map();

  /**
   * Generate trace ID (AWS X-Ray format)
   */
  generateTraceId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const uniqueId = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    return `1-${timestamp}-${uniqueId}`;
  }

  /**
   * Generate segment ID
   */
  generateSegmentId(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Start a new trace segment
   */
  startSegment(name: string, metadata?: Record<string, any>): TraceSegment {
    const segment: TraceSegment = {
      id: this.generateSegmentId(),
      name,
      startTime: Date.now(),
      metadata,
      subsegments: [],
    };

    this.currentSegment = segment;
    this.segments.set(segment.id, segment);

    return segment;
  }

  /**
   * End current segment
   */
  endSegment(segmentId: string, error?: Error): void {
    const segment = this.segments.get(segmentId);
    
    if (segment) {
      segment.endTime = Date.now();
      
      if (error) {
        segment.error = true;
        segment.fault = true;
        segment.metadata = {
          ...segment.metadata,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        };
      }
    }
  }

  /**
   * Add subsegment to current segment
   */
  addSubsegment(
    name: string,
    metadata?: Record<string, any>
  ): TraceSegment {
    const subsegment: TraceSegment = {
      id: this.generateSegmentId(),
      name,
      startTime: Date.now(),
      metadata,
    };

    if (this.currentSegment) {
      this.currentSegment.subsegments = this.currentSegment.subsegments || [];
      this.currentSegment.subsegments.push(subsegment);
    }

    return subsegment;
  }

  /**
   * End subsegment
   */
  endSubsegment(subsegmentId: string, error?: Error): void {
    if (!this.currentSegment?.subsegments) return;

    const subsegment = this.currentSegment.subsegments.find(
      (s) => s.id === subsegmentId
    );

    if (subsegment) {
      subsegment.endTime = Date.now();
      
      if (error) {
        subsegment.error = true;
        subsegment.metadata = {
          ...subsegment.metadata,
          error: {
            message: error.message,
            stack: error.stack,
          },
        };
      }
    }
  }

  /**
   * Add annotation to current segment
   */
  addAnnotation(key: string, value: string | number | boolean): void {
    if (this.currentSegment) {
      this.currentSegment.annotations = this.currentSegment.annotations || {};
      this.currentSegment.annotations[key] = value;
    }
  }

  /**
   * Add metadata to current segment
   */
  addMetadata(key: string, value: any): void {
    if (this.currentSegment) {
      this.currentSegment.metadata = this.currentSegment.metadata || {};
      this.currentSegment.metadata[key] = value;
    }
  }

  /**
   * Get trace context for propagation
   */
  getTraceContext(): TraceContext | null {
    if (!this.currentSegment) return null;

    return {
      traceId: this.generateTraceId(),
      segmentId: this.currentSegment.id,
    };
  }

  /**
   * Trace a search operation
   */
  traceSearch(query: string, operation: string): TraceSegment {
    const segment = this.startSegment('search', {
      query,
      operation,
    });

    this.addAnnotation('query', query);
    this.addAnnotation('operation', operation);

    return segment;
  }

  /**
   * Trace a cache operation
   */
  traceCacheOperation(
    operation: 'get' | 'set' | 'invalidate',
    key: string,
    source?: 'dax' | 'redis' | 'postgres'
  ): TraceSegment {
    const subsegment = this.addSubsegment(`cache_${operation}`, {
      key,
      source,
    });

    return subsegment;
  }

  /**
   * Trace a database operation
   */
  traceDatabaseOperation(
    operation: string,
    table: string,
    query?: string
  ): TraceSegment {
    const subsegment = this.addSubsegment(`db_${operation}`, {
      table,
      query,
    });

    return subsegment;
  }

  /**
   * Export trace for X-Ray
   */
  exportTrace(): string {
    if (!this.currentSegment) return '';

    const trace = {
      trace_id: this.generateTraceId(),
      segments: Array.from(this.segments.values()),
    };

    return JSON.stringify(trace);
  }

  /**
   * Get current segment
   */
  getCurrentSegment(): TraceSegment | null {
    return this.currentSegment;
  }

  /**
   * Clear all segments (for testing)
   */
  clear(): void {
    this.currentSegment = null;
    this.segments.clear();
  }
}

// Export singleton instance
export const xrayTracer = new XRayTracer();
