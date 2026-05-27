export interface ClinicalRecallRequest {
  supplementName: string;
  benefitQuery: string;
}

export interface ClinicalRecallIdentity {
  canonicalName: string;
  aliases: string[];
  clinicalTerms: string[];
  focusedRequests?: ClinicalRecallRequest[];
  controlledHumanPmids?: string[];
  intentGroups?: ClinicalRecallIntentGroup[];
}

export interface ClinicalRecallIntentGroup {
  aliases: string[];
  clinicalTerms: string[];
  focusedRequests?: ClinicalRecallRequest[];
  controlledHumanPmids?: string[];
}

const DEFAULT_CLINICAL_TERMS = [
  'clinical trial',
  'randomized controlled trial',
  'humans',
  'systematic review',
];

export const CLINICAL_RECALL_IDENTITIES: ClinicalRecallIdentity[] = [
  {
    canonicalName: 'Centella asiatica',
    aliases: [
      'Centella asiatica',
      'gotu kola',
      'Centella asiatica extract',
      'total triterpenic fraction of Centella asiatica',
      'TECA Centella asiatica',
    ],
    clinicalTerms: [
      ...DEFAULT_CLINICAL_TERMS,
      'venous insufficiency',
      'wound healing',
      'acoustic startle',
      'cognition',
    ],
    focusedRequests: [
      {
        supplementName: 'total triterpenic fraction of Centella asiatica',
        benefitQuery: 'clinical trial randomized controlled trial humans venous insufficiency',
      },
      {
        supplementName: 'TECA Centella asiatica',
        benefitQuery: 'clinical trial randomized controlled trial humans venous insufficiency',
      },
    ],
    controlledHumanPmids: ['11106141', '35328954', '23533507', '35204098', '3544968', '7936334'],
  },
  {
    canonicalName: 'Cannabis sativa',
    aliases: [
      'Cannabis sativa',
      'cannabis',
      'medical cannabis',
      'medical marijuana',
      'marijuana',
      'marihuana',
      'cannabinoids',
      'cannabidiol',
      'CBD',
      'tetrahydrocannabinol',
      'THC',
      'nabiximols',
      'Sativex',
      'dronabinol',
      'nabilone',
    ],
    clinicalTerms: [
      ...DEFAULT_CLINICAL_TERMS,
      'multiple sclerosis',
      'spasticity',
      'chronic pain',
      'neuropathic pain',
      'chemotherapy nausea vomiting',
      'epilepsy',
      'seizures',
      'sleep',
      'anxiety',
    ],
    focusedRequests: [
      {
        supplementName: 'cannabinoids',
        benefitQuery: 'systematic review meta-analysis humans chronic pain spasticity nausea vomiting',
      },
      {
        supplementName: 'nabiximols',
        benefitQuery: 'randomized controlled trial humans multiple sclerosis spasticity',
      },
      {
        supplementName: 'cannabidiol',
        benefitQuery: 'randomized controlled trial humans epilepsy seizures anxiety sleep',
      },
      {
        supplementName: 'dronabinol',
        benefitQuery: 'randomized controlled trial humans chemotherapy nausea vomiting appetite',
      },
      {
        supplementName: 'nabilone',
        benefitQuery: 'randomized controlled trial humans chemotherapy nausea vomiting pain',
      },
    ],
    controlledHumanPmids: ['19961570', '35982439', '37283486', '31948424', '28349316'],
    intentGroups: [
      {
        aliases: ['Cannabis sativa', 'cannabis', 'medical cannabis', 'medical marijuana', 'marijuana', 'marihuana', 'cannabinoids'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'multiple sclerosis',
          'spasticity',
          'chronic pain',
          'neuropathic pain',
          'chemotherapy nausea vomiting',
          'epilepsy',
          'seizures',
          'sleep',
          'anxiety',
        ],
        focusedRequests: [
          {
            supplementName: 'cannabinoids',
            benefitQuery: 'systematic review meta-analysis humans chronic pain spasticity nausea vomiting',
          },
          {
            supplementName: 'nabiximols',
            benefitQuery: 'randomized controlled trial humans multiple sclerosis spasticity',
          },
          {
            supplementName: 'cannabidiol',
            benefitQuery: 'randomized controlled trial humans epilepsy seizures anxiety sleep',
          },
          {
            supplementName: 'dronabinol',
            benefitQuery: 'randomized controlled trial humans chemotherapy nausea vomiting appetite',
          },
          {
            supplementName: 'nabilone',
            benefitQuery: 'randomized controlled trial humans chemotherapy nausea vomiting pain',
          },
        ],
        controlledHumanPmids: ['19961570', '35982439', '37283486', '31948424', '28349316'],
      },
      {
        aliases: ['cannabidiol', 'CBD'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'cannabidiol',
          'CBD',
          'epilepsy',
          'seizures',
          'anxiety',
          'sleep',
        ],
        focusedRequests: [
          {
            supplementName: 'cannabidiol',
            benefitQuery: 'randomized controlled trial systematic review humans epilepsy seizures anxiety sleep cannabidiol CBD',
          },
        ],
        controlledHumanPmids: [],
      },
      {
        aliases: ['nabiximols', 'Sativex'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'nabiximols',
          'Sativex',
          'multiple sclerosis',
          'spasticity',
        ],
        focusedRequests: [
          {
            supplementName: 'nabiximols',
            benefitQuery: 'randomized controlled trial systematic review humans multiple sclerosis spasticity nabiximols Sativex',
          },
        ],
        controlledHumanPmids: ['19961570'],
      },
      {
        aliases: ['dronabinol'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'dronabinol',
          'chemotherapy nausea vomiting',
          'appetite',
          'pain',
        ],
        focusedRequests: [
          {
            supplementName: 'dronabinol',
            benefitQuery: 'randomized controlled trial systematic review humans chemotherapy nausea vomiting appetite pain dronabinol',
          },
        ],
        controlledHumanPmids: [],
      },
      {
        aliases: ['nabilone'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'nabilone',
          'chemotherapy nausea vomiting',
          'pain',
        ],
        focusedRequests: [
          {
            supplementName: 'nabilone',
            benefitQuery: 'randomized controlled trial systematic review humans chemotherapy nausea vomiting pain nabilone',
          },
        ],
        controlledHumanPmids: [],
      },
      {
        aliases: ['tetrahydrocannabinol', 'THC'],
        clinicalTerms: [
          ...DEFAULT_CLINICAL_TERMS,
          'tetrahydrocannabinol',
          'THC',
          'pain',
          'nausea',
          'vomiting',
          'appetite',
        ],
        focusedRequests: [
          {
            supplementName: 'tetrahydrocannabinol',
            benefitQuery: 'randomized controlled trial systematic review humans pain nausea vomiting appetite tetrahydrocannabinol THC',
          },
        ],
        controlledHumanPmids: [],
      },
    ],
  },
];

function normalizeIdentityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function unique<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function findClinicalRecallIdentity(term: string): ClinicalRecallIdentity | null {
  const normalized = normalizeIdentityKey(term);
  if (!normalized) {
    return null;
  }

  return CLINICAL_RECALL_IDENTITIES.find((identity) =>
    identity.aliases.some((alias) => normalizeIdentityKey(alias) === normalized)
  ) || null;
}

export function canonicalizeClinicalRecallTerm(term: string): string | null {
  return findClinicalRecallIdentity(term)?.canonicalName || null;
}

export function getClinicalRecallAliases(term: string): string[] {
  const identity = findClinicalRecallIdentity(term);
  if (!identity) {
    return [];
  }

  return unique([identity.canonicalName, ...identity.aliases], normalizeIdentityKey);
}

function findClinicalRecallIntentGroup(term: string): ClinicalRecallIntentGroup | null {
  const identity = findClinicalRecallIdentity(term);
  const normalized = normalizeIdentityKey(term);
  if (!identity?.intentGroups || !normalized) {
    return null;
  }

  return identity.intentGroups.find((group) =>
    group.aliases.some((alias) => normalizeIdentityKey(alias) === normalized)
  ) || null;
}

export function getClinicalRecallSearchAliases(term: string): string[] {
  const group = findClinicalRecallIntentGroup(term);
  if (group) {
    return unique(group.aliases, normalizeIdentityKey);
  }
  return getClinicalRecallAliases(term);
}

export function getClinicalRecallTerms(term: string): string[] {
  const group = findClinicalRecallIntentGroup(term);
  if (group) {
    return group.clinicalTerms;
  }
  return findClinicalRecallIdentity(term)?.clinicalTerms || [];
}

export function getControlledHumanPmids(term: string): string[] {
  const group = findClinicalRecallIntentGroup(term);
  if (group) {
    return group.controlledHumanPmids || [];
  }
  return findClinicalRecallIdentity(term)?.controlledHumanPmids || [];
}

export function getClinicalRecallRequests(term: string): ClinicalRecallRequest[] {
  const identity = findClinicalRecallIdentity(term);
  if (!identity) {
    return [];
  }

  const group = findClinicalRecallIntentGroup(term);
  const clinicalTerms = group?.clinicalTerms || identity.clinicalTerms;
  const focusedRequests = group?.focusedRequests || identity.focusedRequests || [];
  const baseBenefitQuery = clinicalTerms.join(' ');
  const aliasRequests = getClinicalRecallSearchAliases(term).map((alias) => ({
    supplementName: alias,
    benefitQuery: baseBenefitQuery,
  }));

  return unique(
    [...aliasRequests, ...focusedRequests],
    (request) => `${normalizeIdentityKey(request.supplementName)}:${normalizeIdentityKey(request.benefitQuery)}`
  );
}
