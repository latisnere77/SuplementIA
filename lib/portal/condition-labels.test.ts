import { formatConditionLabel } from './condition-labels';

describe('formatConditionLabel', () => {
  it.each([
    ['sleep', 'Sleep quality'],
    ['muscles', 'Muscle function'],
    ['cramps', 'Muscle cramps'],
    ['sueño', 'Calidad del sueno'],
    ['músculos', 'Funcion muscular'],
    ['calambres', 'Calambres musculares'],
  ])('formats raw condition tag %s as %s', (input, expected) => {
    expect(formatConditionLabel(input)).toBe(expected);
  });

  it('falls back to a readable title for unknown tags', () => {
    expect(formatConditionLabel('blood pressure')).toBe('Blood Pressure');
  });
});
