import {
  localizeMechanismEvidenceLabel,
  localizeSeverityLabel,
  sanitizeResearchBriefText,
} from './research-brief-presentation';

describe('research brief presentation helpers', () => {
  it('deduplicates repeated interpretation notes', () => {
    const text = [
      'Apoyo para sintomas venosos.',
      'Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico.',
      'Interpretar como apoyo estudiado para sintomas, no como sustituto de tratamiento medico.',
    ].join(' ');

    const sanitized = sanitizeResearchBriefText(text, 'es');

    expect(sanitized.match(/Interpretar como apoyo estudiado/g)).toHaveLength(1);
  });

  it('cleans broken treatment replacement phrases', () => {
    expect(sanitizeResearchBriefText('uso estudiado medico', 'es')).toBe('atención médica');
    expect(sanitizeResearchBriefText('apoyo estudiado para depresión mayor clínica', 'es'))
      .toBe('evidencia limitada para síntomas depresivos; no es tratamiento de depresión mayor');
    expect(sanitizeResearchBriefText('mejoras reportadas en síntesis de neurotransmisores.', 'es'))
      .toBe('cambios reportados.');
  });

  it('replaces false hepatotoxicity reassurance with a cautious warning', () => {
    const sanitized = sanitizeResearchBriefText('No reportes de hepatotoxicidad en estudios revisados.', 'es');

    expect(sanitized).toMatch(/reportes raros de lesión hepática/i);
    expect(sanitized).toMatch(/precaución en enfermedad hepática/i);
    expect(sanitized).not.toMatch(/No reportes de hepatotoxicidad/i);
  });

  it('localizes visible evidence labels', () => {
    expect(localizeSeverityLabel('Generally Safe', 'es')).toBe('Generalmente leve');
    expect(localizeSeverityLabel('Moderate', 'es')).toBe('Moderada');
    expect(localizeMechanismEvidenceLabel('weak', 'es')).toBe('Exploratoria');
  });
});
