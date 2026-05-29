import { calibratePortalRecommendation } from './centella-editorial-calibration';

const CANNABIS_NOTICE = 'Evidencia sobre cannabinoides medicos o formulaciones especificas; no equivale a recomendar Cannabis sativa/CBD como suplemento.';

function countCannabisNotices(value: unknown): number {
  return (JSON.stringify(value).match(new RegExp(CANNABIS_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

describe('cannabis and CBD editorial calibration', () => {
  it('keeps the cannabis regulatory notice out of every individual worksFor item', () => {
    const calibrated: any = calibratePortalRecommendation({
      category: 'Cannabis sativa',
      supplement: {
        name: 'Cannabis sativa',
        description: CANNABIS_NOTICE,
        worksFor: [
          {
            condition: 'Cannabis sativa sirve para multiple sclerosis spasticity',
            evidenceGrade: 'B',
            notes: `${CANNABIS_NOTICE} ${CANNABIS_NOTICE}`,
          },
        ],
        products: [{ name: 'CBD suplemento recomendado', affiliateLink: 'https://example.com/cbd' }],
        practicalRecommendations: [CANNABIS_NOTICE, 'Comprar CBD como suplemento recomendado.'],
      },
      evidence: {
        summary: `Resumen clinico. ${CANNABIS_NOTICE}`,
      },
      products: [{ name: 'CBD oil', affiliateLink: 'https://example.com/cbd' }],
    }, 'Cannabis sativa');

    expect(calibrated.products).toEqual([]);
    expect(calibrated.supplement.products).toEqual([]);
    expect(countCannabisNotices(calibrated.supplement.whatIsIt)).toBe(1);
    expect(calibrated.supplement.description).not.toContain('Cannabidiol (CBD) es un cannabinoide estudiado');
    expect(countCannabisNotices(calibrated.supplement.worksFor)).toBe(0);
    expect(countCannabisNotices(calibrated.supplement.practicalRecommendations)).toBe(1);
    expect(countCannabisNotices(calibrated.evidence.summary)).toBe(0);
    expect(JSON.stringify(calibrated).toLowerCase()).not.toMatch(/suplemento recomendado|comprar|sirve para/);
  });

  it('keeps CBD scoped away from generic supplement and anti-inflammatory claims', () => {
    const calibrated: any = calibratePortalRecommendation({
      category: 'CBD',
      supplement: {
        name: 'CBD',
        description: 'CBD is a dietary supplement ingredient indexed for evidence review in SuplementAI.',
        worksFor: [
          {
            condition: 'Reducir el dolor cronico',
            grade: 'B',
            description: 'Efectivo para dolor neuropatico y fibromialgia',
            notes: 'Propiedades antiinflamatorias comprobadas',
          },
        ],
        limitedEvidence: [],
        products: [{ name: 'CBD gummies', affiliateLink: 'https://example.com/cbd' }],
        studies: { total: 100 },
        totalStudies: 100,
      },
      evidence_summary: {
        totalStudies: 100,
        ingredients: [
          { name: 'Cannabidiol (CBD)', grade: 'B', studyCount: 156, rctCount: 34 },
        ],
      },
    }, 'CBD');

    const serialized = JSON.stringify(calibrated).toLowerCase();
    expect(calibrated.supplement.products).toEqual([]);
    expect(calibrated.supplement.worksFor).toHaveLength(0);
    expect(calibrated.supplement.limitedEvidence).toHaveLength(1);
    expect(calibrated.supplement.description).toContain('Cannabidiol (CBD) es un cannabinoide estudiado');
    expect(calibrated.supplement.totalStudies).toBe(0);
    expect(calibrated.supplement.studies.total).toBe(0);
    expect(calibrated.evidence_summary.totalStudies).toBe(0);
    expect(calibrated.evidence_summary.ingredients[0].studyCount).toBe(0);
    expect(calibrated.evidence_summary.ingredients[0].rctCount).toBe(0);
    expect(serialized).not.toContain('dietary supplement ingredient');
    expect(serialized).not.toContain('propiedades antiinflamatorias comprobadas');
    expect(serialized).not.toContain('100 estudios');
    expect(serialized).not.toMatch(/dronabinol|nabilone|nabiximols|sativex/);
    expect(serialized).not.toMatch(/suplemento recomendado|comprar|sirve para|treats|cures/);
  });
});
