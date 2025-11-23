/**
 * Simple Timeout Manager
 * Manages request budget across multiple stages
 */

export const TIMEOUTS = {
  TOTAL_REQUEST: 95000,    // 95s (5s buffer for Vercel 100s limit)
  TRANSLATION: 5000,       // 5s
  STUDIES_FETCH: 20000,    // 20s
  ENRICHMENT: 40000,       // 40s
} as const;

export class TimeoutManager {
  private startTime: number;
  private budget: number;

  constructor(totalBudget = TIMEOUTS.TOTAL_REQUEST) {
    this.startTime = Date.now();
    this.budget = totalBudget;
  }

  getRemainingBudget(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.budget - elapsed);
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  async executeWithBudget<T>(
    fn: () => Promise<T>,
    stageBudget: number,
    stageName?: string
  ): Promise<T> {
    const remaining = this.getRemainingBudget();
    const timeout = Math.min(stageBudget, remaining);

    if (timeout <= 0) {
      throw new Error(`Request budget exhausted${stageName ? ` at stage: ${stageName}` : ''}`);
    }

    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeout}ms${stageName ? ` in stage: ${stageName}` : ''}`)),
          timeout
        )
      ),
    ]);
  }

  checkBudget(required: number): boolean {
    return this.getRemainingBudget() >= required;
  }
}

/**
 * Simple timeout helper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
