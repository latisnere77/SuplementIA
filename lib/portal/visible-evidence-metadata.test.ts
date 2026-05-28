import {
  getDefaultDosageMessage,
  getVisibleEvidenceMetadata,
  isPlaceholderDosageText,
} from './visible-evidence-metadata';

describe('visible evidence metadata', () => {
  it('does not present local catalog hit counts as reviewed scientific study counts', () => {
    const metadata = getVisibleEvidenceMetadata({
      _response_source: 'local_catalog_fallback',
      evidence_summary: { totalStudies: 2 },
    }, 'es');

    expect(metadata.label).toBe('Evidencia clínica seleccionada');
    expect(metadata.count).toBeUndefined();
    expect(metadata.detail).toMatch(/evidencia curada/i);
  });

  it('shows reviewed sample counts for literature profiles', () => {
    const metadata = getVisibleEvidenceMetadata({
      literatureProfile: { sampleSize: 8 },
    }, 'en');

    expect(metadata.label).toBe('Reviewed sample');
    expect(metadata.count).toBe(8);
    expect(metadata.countLabel).toBe('articles');
  });

  it('detects placeholder dosage values', () => {
    expect(isPlaceholderDosageText('Ver análisis de evidencia')).toBe(true);
    expect(isPlaceholderDosageText('Consultar con profesional')).toBe(true);
    expect(isPlaceholderDosageText('200-400 mg/day elemental magnesium')).toBe(false);
  });

  it('provides controlled fallback dosage copy', () => {
    expect(getDefaultDosageMessage('es')).toMatch(/depende de la forma/i);
    expect(getDefaultDosageMessage('en')).toMatch(/depends on form/i);
  });
});
