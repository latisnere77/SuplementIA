import {
  canonicalizeClinicalRecallTerm,
  getClinicalRecallAliases,
  getClinicalRecallRequests,
} from '../clinical-recall-identity';

describe('clinical recall identity', () => {
  function requestNames(term: string) {
    return getClinicalRecallRequests(term).map((request) => request.supplementName.toLowerCase());
  }

  function requestText(term: string) {
    return JSON.stringify(getClinicalRecallRequests(term)).toLowerCase();
  }

  it('keeps Centella/Gotu Kola aliases in a reusable clinical recall registry', () => {
    expect(canonicalizeClinicalRecallTerm('gotu kola')).toBe('Centella asiatica');
    expect(getClinicalRecallAliases('centella asiatica')).toEqual(expect.arrayContaining([
      'Centella asiatica',
      'gotu kola',
      'TECA Centella asiatica',
    ]));
  });

  it('maps Cannabis sativa and cannabinoid derivatives to controlled clinical recall requests', () => {
    expect(canonicalizeClinicalRecallTerm('cannabis sativa')).toBe('Cannabis sativa');
    expect(canonicalizeClinicalRecallTerm('cannabidiol')).toBe('Cannabis sativa');

    const requests = getClinicalRecallRequests('cannabis sativa');
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        supplementName: 'Cannabis sativa',
        benefitQuery: expect.stringContaining('multiple sclerosis'),
      }),
      expect.objectContaining({
        supplementName: 'nabiximols',
        benefitQuery: expect.stringContaining('spasticity'),
      }),
      expect.objectContaining({
        supplementName: 'cannabidiol',
        benefitQuery: expect.stringContaining('epilepsy'),
      }),
      expect.objectContaining({
        supplementName: 'dronabinol',
        benefitQuery: expect.stringContaining('chemotherapy nausea vomiting'),
      }),
    ]));
  });

  it('keeps CBD recall scoped to cannabidiol instead of THC or synthetic cannabinoid lanes', () => {
    const names = requestNames('CBD');
    const text = requestText('CBD');

    expect(names).toEqual(expect.arrayContaining(['cannabidiol', 'cbd']));
    expect(names).not.toEqual(expect.arrayContaining(['dronabinol', 'nabilone', 'nabiximols', 'sativex']));
    expect(text).toContain('epilepsy');
    expect(text).toContain('seizures');
    expect(text).not.toContain('chemotherapy nausea vomiting');
    expect(text).not.toContain('multiple sclerosis');
  });

  it('keeps nabiximols recall scoped to MS spasticity instead of CBD epilepsy lanes', () => {
    const names = requestNames('nabiximols');
    const text = requestText('nabiximols');

    expect(names).toEqual(expect.arrayContaining(['nabiximols', 'sativex']));
    expect(names).not.toEqual(expect.arrayContaining(['cannabidiol', 'cbd', 'dronabinol', 'nabilone']));
    expect(text).toContain('multiple sclerosis');
    expect(text).toContain('spasticity');
    expect(text).not.toContain('epilepsy');
  });

  it('keeps dronabinol recall scoped away from CBD epilepsy and nabiximols MS lanes', () => {
    const names = requestNames('dronabinol');
    const text = requestText('dronabinol');

    expect(names).toEqual(['dronabinol', 'dronabinol']);
    expect(names).not.toEqual(expect.arrayContaining(['cannabidiol', 'cbd', 'nabiximols', 'sativex']));
    expect(text).toContain('chemotherapy nausea vomiting');
    expect(text).not.toContain('epilepsy');
    expect(text).not.toContain('multiple sclerosis');
  });

  it('keeps THC recall separate from CBD formulation lanes', () => {
    const names = requestNames('THC');
    const text = requestText('THC');

    expect(names).toEqual(expect.arrayContaining(['tetrahydrocannabinol', 'thc']));
    expect(names).not.toEqual(expect.arrayContaining(['cannabidiol', 'cbd']));
    expect(text).not.toContain('epilepsy');
  });

  it('does not add uncontrolled recall lanes for low-evidence botanical canaries', () => {
    expect(canonicalizeClinicalRecallTerm('Piper auritum')).toBeNull();
    expect(getClinicalRecallRequests('Fadogia agrestis')).toEqual([]);
    expect(getClinicalRecallRequests('hoja de aguacate')).toEqual([]);
  });

  it('does not collapse hemp seed or nutritional hemp into cannabinoid clinical recall', () => {
    expect(canonicalizeClinicalRecallTerm('hemp seed')).toBeNull();
    expect(canonicalizeClinicalRecallTerm('hemp protein')).toBeNull();
    expect(getClinicalRecallRequests('hemp seed')).toEqual([]);
  });
});
