import { estimateAuditCost, estimateAuditTokens } from './cost-estimator';

describe('research audit cost estimator', () => {
  it('estimates tokens from serialized payload size', () => {
    const tokens = estimateAuditTokens({ query: 'Garcinia Cambogia', statusCounts: { insufficient_data: 12 } });

    expect(tokens.input).toBeGreaterThan(0);
    expect(tokens.output).toBeGreaterThanOrEqual(250);
    expect(tokens.output).toBeLessThanOrEqual(1500);
  });

  it('maps model to provider and low dry-run cost', () => {
    const estimate = estimateAuditCost({
      model: 'gpt-5.4-nano',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(estimate.provider).toBe('openai');
    expect(estimate.totalCostUsd).toBeGreaterThan(0);
    expect(estimate.totalCostUsd).toBeLessThan(0.01);
  });
});
