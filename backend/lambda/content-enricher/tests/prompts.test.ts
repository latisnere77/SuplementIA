import { validateEnrichedContent, buildEnrichmentPrompt } from '../src/prompts';

describe('validateEnrichedContent', () => {
  // Base valid data structure for tests
  const createValidData = (): Record<string, unknown> => ({
    whatIsIt: 'A natural compound',
    primaryUses: ['Energy', 'Focus'],
    mechanisms: [
      {
        name: 'ATP Production',
        description: 'Enhances cellular energy',
        evidenceLevel: 'strong',
        target: 'Mitochondria',
      },
    ],
    worksFor: [
      {
        condition: 'Physical performance',
        evidenceGrade: 'A',
        effectSize: 'Large',
      },
    ],
    dosage: {
      standard: '5g/day',
      timing: 'Any time',
      duration: '8 weeks',
    },
    safety: {
      overallRating: 'Generally Safe',
    },
    buyingGuidance: {
      preferredForm: 'Monohydrate powder',
      keyCompounds: [
        {
          name: 'Creatine monohydrate',
          source: 'Synthetic',
          lookFor: '99.9% purity',
        },
      ],
      avoidFlags: ['Proprietary blends'],
      qualityIndicators: ['Third-party tested', 'Creapure certified'],
      notes: 'Most studied form',
    },
  });

  describe('buyingGuidance validation', () => {
    it('should pass with valid buyingGuidance structure', () => {
      const data = createValidData();
      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when buyingGuidance.preferredForm is missing', () => {
      const data = createValidData();
      const buyingGuidance = data.buyingGuidance as Record<string, unknown>;
      buyingGuidance.preferredForm = undefined;

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('buyingGuidance.preferredForm is required');
    });

    it('should fail when buyingGuidance.keyCompounds is not an array', () => {
      const data = createValidData();
      const buyingGuidance = data.buyingGuidance as Record<string, unknown>;
      buyingGuidance.keyCompounds = 'not an array';

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('buyingGuidance.keyCompounds must be an array');
    });

    it('should fail when buyingGuidance.qualityIndicators is not an array', () => {
      const data = createValidData();
      const buyingGuidance = data.buyingGuidance as Record<string, unknown>;
      buyingGuidance.qualityIndicators = { invalid: 'object' };

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('buyingGuidance.qualityIndicators must be an array');
    });

    it('should fail when buyingGuidance is missing entirely', () => {
      const data = createValidData();
      // Use object without buyingGuidance field
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { buyingGuidance: _, ...dataWithoutBuyingGuidance } = data;

      const result = validateEnrichedContent(dataWithoutBuyingGuidance);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: buyingGuidance');
    });
  });

  describe('mechanisms validation', () => {
    it('should pass with valid mechanisms structure', () => {
      const data = createValidData();
      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all valid evidenceLevel values', () => {
      const validLevels = ['strong', 'moderate', 'weak'];

      validLevels.forEach((level) => {
        const data = createValidData();
        const mechanisms = data.mechanisms as Array<Record<string, unknown>>;
        mechanisms[0].evidenceLevel = level;

        const result = validateEnrichedContent(data);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should fail when mechanism has invalid evidenceLevel', () => {
      const data = createValidData();
      const mechanisms = data.mechanisms as Array<Record<string, unknown>>;
      mechanisms[0].evidenceLevel = 'preliminary'; // No longer valid

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mechanisms[0].evidenceLevel must be strong, moderate, or weak');
    });

    it('should fail when mechanism is missing name', () => {
      const data = createValidData();
      const mechanisms = data.mechanisms as Array<Record<string, unknown>>;
      mechanisms[0].name = undefined;

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mechanisms[0] must have name and evidenceLevel');
    });

    it('should fail when mechanism is missing evidenceLevel', () => {
      const data = createValidData();
      const mechanisms = data.mechanisms as Array<Record<string, unknown>>;
      mechanisms[0].evidenceLevel = undefined;

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mechanisms[0] must have name and evidenceLevel');
    });

    it('should validate multiple mechanisms independently', () => {
      const data = createValidData();
      const mechanisms = data.mechanisms as Array<Record<string, unknown>>;
      mechanisms.push({
        name: 'Second mechanism',
        description: 'Another pathway',
        evidenceLevel: 'invalid',
        target: 'Brain',
      });

      const result = validateEnrichedContent(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mechanisms[1].evidenceLevel must be strong, moderate, or weak');
    });
  });

  describe('prompt structure validation', () => {
    it('should include buyingGuidance instructions in the prompt', () => {
      const prompt = buildEnrichmentPrompt('Creatine', 'Sports Nutrition');

      expect(prompt).toContain('buyingGuidance');
      expect(prompt).toContain('preferredForm');
      expect(prompt).toContain('keyCompounds');
      expect(prompt).toContain('avoidFlags');
      expect(prompt).toContain('qualityIndicators');
    });

    it('should include prohibition of fabricating pharmacokinetic data', () => {
      const prompt = buildEnrichmentPrompt('Ashwagandha', 'Adaptogens');

      expect(prompt).toContain('PROHIBIDO INVENTAR DATOS FARMACOCINÉTICOS');
      expect(prompt).toContain('NO inventes porcentajes de absorción');
    });

    it('should include mechanism evidence requirements', () => {
      const prompt = buildEnrichmentPrompt('Lion\'s Mane', 'Nootropics');

      expect(prompt).toContain('MECANISMOS - SOLO EVIDENCIA ESTABLECIDA');
      expect(prompt).toContain('evidenceLevel');
      expect(prompt).toContain('strong');
      expect(prompt).toContain('moderate');
      expect(prompt).toContain('weak');
    });
  });
});
