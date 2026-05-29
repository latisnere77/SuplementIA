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
          products: [
            {
              name: 'Standardized Garcinia extract',
              brand: 'Test Brand',
              price: '$19.99',
            },
          ],
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
    expect(body.recommendation.products).toHaveLength(1);
    expect(body.recommendation.recommendation_id).toBeTruthy();
    expect(body.recommendation.evidence_summary.totalStudies).toBe(12);
    expect(body.recommendation.evidence_summary.ingredients[0].grade).toBe('B');
    expect(body.recommendation._enrichment_metadata.source).toBe('lambda_async');
  });

  it('calibrates raw Centella Lambda responses before status polling returns them', async () => {
    mockedGetJob.mockResolvedValue({
      id: 'job_centella',
      status: 'completed',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      recommendation: {
        metadata: {
          supplementId: 'gotu kola',
          studiesUsed: 8,
        },
        data: {
          name: 'Centella asiatica',
          whatIsIt: 'Gotu kola con eficacia demostrada en el tratamiento de insuficiencia venosa.',
          totalStudies: 8,
          primaryUses: [
            'apoyo estudiado para insuficiencia venosa cronica - reduce edema en 60-70% de pacientes',
            'Estudios in vitro demuestran aumento de 30-40% en sintesis de colageno',
          ],
          worksFor: [
            {
              condition: 'Insuficiencia venosa cronica',
              evidenceGrade: 'A',
              magnitude: 'Mejora 60-70%',
            },
            {
              condition: 'Cognition from PK/PD phase 1',
              evidenceGrade: 'B',
              magnitude: 'Mejora 5-15%',
            },
          ],
          limitedEvidence: [],
          mechanisms: ['aumento de 30-40% en sintesis de colageno'],
          safety: {
            longTermSafety: 'No reportes de hepatotoxicidad.',
            contraindications: [],
          },
        },
      },
    } as any);

    const response = await GET(createRequest('job_centella'), {
      params: Promise.resolve({ id: 'job_centella' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    const supplement = body.recommendation.supplement;
    const serialized = JSON.stringify(supplement).toLowerCase();

    expect(supplement.worksFor).toHaveLength(1);
    expect(supplement.worksFor[0].evidenceGrade).toBe('B');
    expect(supplement.limitedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceGrade: 'C',
          condition: expect.stringContaining('Cognition'),
        }),
      ])
    );
    expect(serialized).not.toMatch(/60-70%|30-40%|5-15%/);
    expect(serialized).not.toContain('eficacia demostrada');
    expect(serialized).not.toContain('tratamiento de');
    expect(serialized).toMatch(/lesion hepatica|hepatotoxicidad/);
  });

  it("smooths untraced preclinical Lion's Mane percentages before status polling returns them", async () => {
    mockedGetJob.mockResolvedValue({
      id: 'job_lions_mane',
      status: 'completed',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      recommendation: {
        metadata: {
          supplementId: "Lion's Mane",
          studiesUsed: 12,
        },
        data: {
          name: "Lion's Mane",
          whatIsIt: "Lion's Mane (Hericium erinaceus) tiene evidencia humana preliminar para cognición.",
          totalStudies: 12,
          worksFor: [
            {
              condition: 'Deterioro cognitivo leve en adultos mayores',
              evidenceGrade: 'B',
              notes: 'Estudios humanos pequeños sugieren apoyo cognitivo limitado.',
            },
          ],
          limitedEvidence: [
            {
              condition: 'Neuropatía diabética',
              evidenceGrade: 'C',
              notes: 'Evidencia limitada a estudios animales con reducción de 30-40% en marcadores de dolor.',
            },
          ],
          mechanisms: [
            'Estudios in vitro muestran reducción de marcadores inflamatorios.',
            'En modelos animales se ha observado reducción de 30-40% en marcadores de peroxidación lipídica.',
          ],
          primaryUses: [
            'Mejora de síntomas digestivos y protección de mucosa gástrica con reducción de molestias en 30-40% según estudios pequeños.',
            'Dosis estudiada: 500-3000 mg/día de extracto estandarizado.',
          ],
          safety: {
            sideEffects: ['Malestar gastrointestinal leve reportado por 5-10% de participantes en algunos estudios.'],
            contraindications: [],
          },
        },
      },
    } as any);

    const response = await GET(createRequest('job_lions_mane'), {
      params: Promise.resolve({ id: 'job_lions_mane' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    const serialized = JSON.stringify(body.recommendation.supplement).toLowerCase();

    expect(body.recommendation.supplement.worksFor).toHaveLength(1);
    expect(serialized).not.toMatch(/30-40%/);
    expect(serialized).toContain('5-10%');
    expect(serialized).toContain('500-3000 mg');
    expect(serialized).toContain('estudios animales');
    expect(serialized).toContain('modelos animales');
    expect(serialized).toContain('cambios');
  });

  it('drops Lambda products when there are no A/B supported uses', async () => {
    mockedGetJob.mockResolvedValue({
      id: 'job_insufficient',
      status: 'completed',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      recommendation: {
        metadata: {
          supplementId: 'hoja de aguacate',
          studiesUsed: 4,
        },
        data: {
          name: 'hoja de aguacate',
          whatIsIt: 'Literatura contextual preclínica sobre hoja de aguacate.',
          totalStudies: 4,
          worksFor: [],
          doesntWorkFor: [],
          limitedEvidence: [
            {
              condition: 'Presión arterial en modelos animales',
              evidenceGrade: 'C',
            },
          ],
          products: [
            {
              name: 'Generic avocado leaf capsules',
              brand: 'Placeholder',
              price: '$12.99',
            },
          ],
          safety: {
            sideEffects: [],
            contraindications: [],
            interactions: [],
          },
        },
      },
    } as any);

    const response = await GET(createRequest('job_insufficient'), {
      params: Promise.resolve({ id: 'job_insufficient' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.recommendation.supplement.worksFor).toEqual([]);
    expect(body.recommendation.products).toEqual([]);
  });

  it('blocks Cannabis/CBD products and generic supplement wording even with B-grade worksFor', async () => {
    mockedGetJob.mockResolvedValue({
      id: 'job_cannabis',
      status: 'completed',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      recommendation: {
        metadata: {
          supplementId: 'cannabis sativa',
          studiesUsed: 4,
        },
        data: {
          name: 'Cannabis sativa',
          whatIsIt: 'Cannabis sativa sirve para espasticidad segun marketing.',
          totalStudies: 4,
          worksFor: [
            {
              condition: 'Cannabis sativa sirve para multiple sclerosis spasticity',
              evidenceGrade: 'B',
              studyCount: 1,
            },
          ],
          products: [
            {
              name: 'CBD suplemento recomendado',
              affiliateLink: 'https://example.com/cbd',
            },
          ],
          practicalRecommendations: ['Comprar CBD como suplemento recomendado.'],
        },
      },
    } as any);

    const response = await GET(createRequest('job_cannabis'), {
      params: Promise.resolve({ id: 'job_cannabis' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    const serialized = JSON.stringify(body.recommendation).toLowerCase();

    expect(body.recommendation.supplement.worksFor[0].condition).toContain('Nabiximols');
    expect(body.recommendation.products).toEqual([]);
    expect(serialized).toContain('formulaciones especificas');
    expect(JSON.stringify(body.recommendation.supplement.worksFor)).not.toContain('no equivale a recomendar Cannabis sativa/CBD como suplemento');
    expect((JSON.stringify(body.recommendation.supplement.practicalRecommendations).match(/no equivale a recomendar Cannabis sativa\/CBD como suplemento/g) || [])).toHaveLength(1);
    expect(serialized).not.toMatch(/suplemento recomendado|comprar|sirve para/);
  });
});
