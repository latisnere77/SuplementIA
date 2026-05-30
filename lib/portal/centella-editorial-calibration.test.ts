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
    expect(countCannabisNotices(calibrated.supplement.practicalRecommendations)).toBe(0);
    expect(countCannabisNotices(calibrated.evidence.summary)).toBe(0);
    expect(countCannabisNotices(calibrated)).toBe(1);
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
            condition: 'Epidiolex cannabidiol farmaceutico para Lennox-Gastaut, Dravet y TSC',
            grade: 'A',
            description: 'Cannabidiol farmaceutico redujo crisis 41.2% frente a placebo en ensayos pivotales.',
            notes: 'Formulacion farmaceutica especifica; no extrapolar a CBD gummies.',
          },
          {
            condition: 'Reducir el dolor cronico',
            grade: 'B',
            description: 'Efectivo para dolor neuropatico y fibromialgia',
            notes: 'Propiedades antiinflamatorias comprobadas y mejora 30-40%',
          },
        ],
        limitedEvidence: [
          {
            condition: 'CBD para ansiedad y sueño',
            grade: 'B',
            notes: 'Estudios pequenos reportan mejora de 25-35%.',
          },
        ],
        primaryUses: [
          'CBD sirve para ansiedad con mejora 32-37%.',
          'CBD comercial mejora sueño 15-25%.',
          'CBD tiene beneficio confirmado para dolor 20-30%.',
          'Propiedades antiinflamatorias comprobadas.',
        ],
        products: [{ name: 'CBD gummies', affiliateLink: 'https://example.com/cbd' }],
        studies: { total: 100 },
        totalStudies: 100,
        safety: {
          notes: 'Generally Safe.',
        },
      },
      data: {
        name: 'CBD',
        worksFor: [
          {
            condition: 'Nabiximols for multiple sclerosis spasticity',
            grade: 'B',
            notes: 'Sativex evidence.',
          },
        ],
        products: [{ name: 'Sativex affiliate placeholder' }],
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
    expect(calibrated.supplement.worksFor).toHaveLength(1);
    expect(calibrated.supplement.worksFor[0].condition).toContain('Cannabidiol farmaceutico/Epidiolex');
    expect(calibrated.supplement.worksFor[0].notes).toContain('no se extrapola');
    expect(calibrated.supplement.limitedEvidence).toHaveLength(2);
    expect(calibrated.supplement.limitedEvidence.every((item: any) => item.grade === 'C' || item.evidenceGrade === 'C')).toBe(true);
    expect(calibrated.data.worksFor).toHaveLength(0);
    expect(calibrated.data.limitedEvidence || []).toHaveLength(0);
    expect(calibrated.data.products).toEqual([]);
    expect(calibrated.supplement.description).toContain('Epidiolex/cannabidiol farmaceutico no equivale');
    expect(calibrated.supplement.primaryUses).toHaveLength(2);
    expect(calibrated.supplement.primaryUses.join(' ')).toContain('CBD comercial/OTC');
    expect(calibrated.supplement.primaryUses.join(' ')).toContain('evidencia limitada/investigacional');
    expect(calibrated.supplement.safety.notes).toContain('puede elevar transaminasas');
    expect(JSON.stringify(calibrated.supplement.safety).toLowerCase()).toMatch(/clobazam|valproato|antiepilepticos|sedantes/);
    expect(calibrated.supplement.totalStudies).toBe(0);
    expect(calibrated.supplement.studies.total).toBe(0);
    expect(calibrated.evidence_summary.totalStudies).toBe(0);
    expect(calibrated.evidence_summary.ingredients[0].studyCount).toBe(0);
    expect(calibrated.evidence_summary.ingredients[0].rctCount).toBe(0);
    expect(serialized).not.toContain('dietary supplement ingredient');
    expect(serialized).not.toContain('propiedades antiinflamatorias comprobadas');
    expect(serialized).not.toContain('beneficio confirmado');
    expect(serialized).not.toContain('100 estudios');
    expect(serialized).not.toMatch(/dronabinol|nabilone|nabiximols|sativex/);
    expect(serialized).not.toMatch(/suplemento recomendado|comprar|sirve para|treats|cures/);
    expect(serialized).not.toMatch(/\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*%/);
    expect(serialized).toContain('cbd comercial/otc');
  });
});
