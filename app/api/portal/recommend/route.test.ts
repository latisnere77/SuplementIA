/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('/api/portal/recommend POST', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the incoming request origin for enrich-v2 fallback in local smoke runs', async () => {
    const originalVercelUrl = process.env.VERCEL_URL;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'No encontramos evidencia clínica humana suficiente para confirmar beneficios de "Piper auritum".',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    try {
      const request = new NextRequest('http://127.0.0.1:3100/api/portal/recommend', {
        method: 'POST',
        body: JSON.stringify({
          category: 'Piper auritum',
          age: 35,
          gender: 'male',
          location: 'CDMX',
          quiz_id: 'quiz_recommend_origin_test',
          jobId: 'job_recommend_origin_test',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('insufficient_data');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3100/api/portal/enrich-v2',
        expect.objectContaining({ method: 'POST' })
      );
    } finally {
      if (originalVercelUrl === undefined) {
        delete process.env.VERCEL_URL;
      } else {
        process.env.VERCEL_URL = originalVercelUrl;
      }
      if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      }
    }
  });

  it('calibrates Centella claims from the content enricher to avoid overclaiming', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            name: 'Centella asiatica',
            whatIsIt: 'Centella asiatica tiene eficacia demostrada en el tratamiento de insuficiencia venosa y efectos cognitivos.',
            dosage: {
              standard: '60-120 mg/dia de TECA para insuficiencia venosa.',
              notes: 'Usado en estudios clinicos.',
            },
            worksFor: [
              {
                condition: 'Insuficiencia venosa cronica - tratamiento de edema y dolor',
                evidenceGrade: 'A',
                notes: 'PMID 3544968 y 7936334 documentan eficacia demostrada.',
                magnitude: 'Mejora 60-70% y 25-35% en parametros microcirculatorios.',
                studyCount: 8,
                rctCount: 4,
              },
              {
                condition: 'Cicatrizacion topica de heridas',
                evidenceGrade: 'A',
                notes: 'Acelera cierre de heridas.',
                magnitude: 'Acelera cierre en 30-40%.',
                studyCount: 4,
                rctCount: 2,
              },
              {
                condition: 'Reduccion de ansiedad por sobresalto acustico',
                evidenceGrade: 'B',
                notes: 'PMID 11106141 en sujetos sanos.',
                magnitude: 'Reduccion 10-20%.',
                studyCount: 1,
                rctCount: 1,
              },
              {
                condition: 'Soporte cognitivo por estudio PK/PD fase 1',
                evidenceGrade: 'B',
                notes: 'PMID 35204098 mostro farmacocinetica en cuatro adultos mayores.',
                magnitude: 'Mejora 5-15%.',
                studyCount: 1,
                rctCount: 1,
              },
            ],
            limitedEvidence: [],
            safety: {
              longTermSafety: 'No reportes de hepatotoxicidad, nefrotoxicidad o toxicidad sistemica en literatura clinica.',
              notes: 'Generalmente seguro.',
              contraindications: [
                'Enfermedad hepatica severa - metabolismo hepatico de triterpenos, usar con precaucion aunque no hay reportes de hepatotoxicidad',
              ],
            },
            totalStudies: 8,
          },
          metadata: {
            hasRealData: true,
            studiesUsed: 8,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const request = new NextRequest('http://localhost/api/portal/recommend', {
      method: 'POST',
      body: JSON.stringify({
        category: 'gotu kola',
        age: 35,
        gender: 'male',
        location: 'CDMX',
        quiz_id: 'quiz_centella_calibration_test',
        jobId: 'job_centella_calibration_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();
    const supplement = body.recommendation.supplement;
    const serialized = JSON.stringify(supplement).toLowerCase();

    expect(response.status).toBe(200);
    expect(supplement.worksFor).toHaveLength(2);
    expect(supplement.worksFor.every((item: any) => item.evidenceGrade !== 'A')).toBe(true);
    expect(supplement.worksFor.map((item: any) => item.condition.toLowerCase())).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('cognitivo'),
        expect.stringContaining('ansiedad'),
      ])
    );
    expect(supplement.limitedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceGrade: 'C',
          condition: expect.stringContaining('ansiedad'),
        }),
        expect.objectContaining({
          evidenceGrade: 'C',
          condition: expect.stringContaining('cognitivo'),
        }),
      ])
    );
    expect(serialized).not.toMatch(/60-70%|25-35%|30-40%|10-20%|5-15%/);
    expect(serialized).not.toContain('eficacia demostrada');
    expect(serialized).not.toContain('tratamiento de');
    expect(serialized).not.toMatch(/no hay reportes de hepatotoxicidad|no reportes de hepatotoxicidad/);
    expect(serialized).not.toMatch(/aunque generalmente bien tolerada|y generalmente bien tolerada/);
    expect(serialized).toMatch(/lesion hepatica|hepatotoxicidad/);
  });

  it('does not pass through enriched products without A/B supported uses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            name: 'Garcinia Cambogia',
            whatIsIt: 'Extracto investigado con evidencia mixta o no concluyente.',
            worksFor: [
              {
                condition: 'Pérdida de peso',
                evidenceGrade: 'C',
                notes: 'La evidencia humana disponible no es concluyente.',
                studyCount: 4,
              },
            ],
            limitedEvidence: [],
            products: [
              {
                name: 'Generic Garcinia capsules',
                brand: 'Placeholder',
                price: '$19.99',
              },
            ],
            totalStudies: 4,
          },
          metadata: {
            hasRealData: true,
            studiesUsed: 4,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const request = new NextRequest('http://localhost/api/portal/recommend', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Garcinia Cambogia',
        age: 35,
        gender: 'female',
        location: 'CDMX',
        quiz_id: 'quiz_product_gate_test',
        jobId: 'job_product_gate_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendation.supplement.worksFor[0].evidenceGrade).toBe('C');
    expect(body.recommendation.products).toEqual([]);
  });
});
