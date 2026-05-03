/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from './route';
import { getJob } from '@/lib/portal/job-store';

jest.mock('@/lib/portal/job-store', () => ({
  cleanupExpired: jest.fn(),
  getJob: jest.fn(),
}));

jest.mock('@/lib/portal/api-logger', () => ({
  portalLogger: {
    logRequest: jest.fn(),
    logError: jest.fn(),
    logSuccess: jest.fn(),
  },
}));

const mockedGetJob = getJob as jest.MockedFunction<typeof getJob>;

function createRequest(jobId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/portal/status/${jobId}`);
}

describe('Portal status route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes raw Lambda enrichment responses for the results UI', async () => {
    mockedGetJob.mockResolvedValue({
      id: 'job_123',
      status: 'completed',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      recommendation: {
        metadata: {
          supplementId: 'garcinia cambogia',
          studiesUsed: 12,
        },
        data: {
          whatIsIt: 'Garcinia cambogia extract standardized for hydroxycitric acid.',
          totalStudies: 12,
          worksFor: [
            {
              condition: 'Short-term weight loss',
              evidenceGrade: 'B',
              studyCount: 5,
              rctCount: 3,
              totalParticipants: 420,
            },
          ],
          doesntWorkFor: [],
          limitedEvidence: [],
          mechanisms: [],
          dosage: {
            standard: '1500 mg/day',
          },
          safety: {
            sideEffects: [{ effect: 'GI upset', frequency: 'Occasional' }],
            contraindications: ['Pregnancy'],
            interactions: [],
          },
          buyingGuidance: {
            preferredForm: 'Standardized extract',
          },
        },
      },
    } as any);

    const response = await GET(createRequest('job_123'), {
      params: Promise.resolve({ id: 'job_123' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.recommendation.supplement.name).toBe('garcinia cambogia');
    expect(body.recommendation.supplement.worksFor).toHaveLength(1);
    expect(body.recommendation.supplement.dosage.standard).toBe('1500 mg/day');
    expect(body.recommendation.supplement.sideEffects).toHaveLength(1);
    expect(body.recommendation.evidence_summary.totalStudies).toBe(12);
    expect(body.recommendation.evidence_summary.ingredients[0].grade).toBe('B');
    expect(body.recommendation._enrichment_metadata.source).toBe('lambda_async');
  });
});
