import { expect, test, type Page } from '@playwright/test';

type QuizRequest = {
  category: string;
  age: number;
  gender: string;
  location: string;
  jobId: string;
  benefitQuery?: string;
};

const recommendation = {
  recommendation_id: 'rec_magnesium_browser_test',
  quiz_id: 'quiz_browser_test',
  category: 'Magnesium',
  evidence_summary: {
    totalStudies: 142,
    totalParticipants: 12450,
    efficacyPercentage: 89,
    researchSpanYears: 12,
    ingredients: [
      { name: 'Magnesium Glycinate', grade: 'A', studyCount: 98, rctCount: 56 },
      { name: 'Magnesium Citrate', grade: 'A', studyCount: 67, rctCount: 34 },
    ],
    studies: {
      total: 142,
      ranked: {
        positive: [],
        negative: [],
        metadata: {
          consensus: 'strong_positive',
          confidenceScore: 0.87,
          totalPositive: 12,
          totalNegative: 1,
          totalNeutral: 3,
        },
      },
    },
  },
  ingredients: [
    {
      name: 'Magnesium Glycinate',
      grade: 'A',
      adjustedDose: '200-400 mg/dia',
      adjustmentReason: 'Forma con buena tolerancia digestiva.',
    },
  ],
  supplement: {
    name: 'Magnesium',
    description: 'Magnesium is an essential mineral involved in muscle, nerve, and sleep physiology.',
    worksFor: [
      {
        condition: 'Sleep quality',
        evidenceGrade: 'A',
        notes: 'Most useful when baseline magnesium intake is low.',
        studyCount: 24,
        metaAnalysis: true,
      },
    ],
    doesntWorkFor: [
      {
        condition: 'Instant sedation',
        evidenceGrade: 'D',
        notes: 'Clinical effects are not immediate sedatives.',
        studyCount: 3,
      },
    ],
    limitedEvidence: [
      {
        condition: 'Migraine frequency',
        evidenceGrade: 'C',
        notes: 'Promising but population-specific.',
        studyCount: 8,
      },
    ],
    dosage: {
      effectiveDose: '200-400 mg elemental magnesium daily',
      standard: '200-350 mg daily with food',
      timing: 'Evening dosing is common when sleep is the target.',
      notes: 'Start low if prone to digestive side effects.',
    },
    sideEffects: [
      { effect: 'Loose stools', frequency: 'Common', notes: 'More common with oxide or high doses.' },
      { effect: 'Low blood pressure', frequency: 'Rare', notes: 'Risk rises with high intakes.' },
    ],
    interactions: [
      {
        medication: 'Levothyroxine',
        severity: 'Moderate',
        description: 'Separate dosing because minerals can reduce absorption.',
      },
    ],
    contraindications: ['Severe kidney disease without medical supervision'],
    mechanisms: [
      {
        name: 'NMDA receptor modulation',
        description: 'May influence nervous system excitability.',
        evidenceLevel: 'moderate',
      },
    ],
  },
  products: [
    {
      tier: 'budget',
      name: 'Magnesium Glycinate Basic',
      price: 180,
      currency: 'MXN',
      contains: ['Magnesium glycinate 200 mg'],
      whereToBuy: 'Amazon Mexico',
      affiliateLink: 'https://example.com/budget',
      description: 'Simple low-cost magnesium option.',
      isAnkonere: false,
    },
    {
      tier: 'value',
      name: 'Magnesium Sleep Stack',
      price: 320,
      currency: 'MXN',
      contains: ['Magnesium glycinate 300 mg', 'L-theanine 100 mg'],
      whereToBuy: 'Amazon Mexico',
      affiliateLink: 'https://example.com/value',
      description: 'Balanced option for sleep routines.',
      isAnkonere: false,
    },
    {
      tier: 'premium',
      name: 'ANKONERE Magnesium Pro',
      price: 490,
      currency: 'MXN',
      contains: ['Magnesium glycinate 300 mg', 'Vitamin B6'],
      whereToBuy: 'ANKONERE Direct',
      directLink: 'https://example.com/premium',
      description: 'Premium formula with cofactors.',
      isAnkonere: true,
    },
  ],
  personalization_factors: {
    age: 35,
    gender: 'male',
    location: 'CDMX',
  },
  _enrichment_metadata: {
    studiesUsed: 142,
    hasRealData: true,
  },
};

async function mockAutocomplete(page: Page) {
  await page.route('**/api/portal/autocomplete**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        suggestions: [
          { text: 'Magnesium', type: 'supplement', score: 1 },
          { text: 'Magnesium glycinate', type: 'supplement', score: 0.94 },
        ],
      }),
    });
  });
}

async function mockSuccessfulQuiz(page: Page, requests: QuizRequest[] = []) {
  await page.route('**/api/portal/quiz**', async (route) => {
    const body = route.request().postDataJSON() as QuizRequest;
    requests.push(body);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        searchType: 'ingredient',
        jobId: body.jobId,
        recommendation,
      }),
    });
  });
}

test.describe('portal browser flows', () => {
  test('home renders localized search experience and autocomplete suggestions', async ({ page }) => {
    await mockAutocomplete(page);

    await page.goto('/en/portal');

    await expect(page.getByRole('button', { name: 'SuplementAI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Evidence-Based Health Solutions/i })).toBeVisible();
    await expect(page.getByText('Popular Searches')).toBeVisible();
    await expect(page.getByText('Browse by Category')).toBeVisible();

    const searchInput = page.getByLabel('Search supplements');
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially('mag');

    await expect(page.getByRole('option', { name: /Magnesium$/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Magnesium glycinate/ })).toBeVisible();
  });

  test('search submission posts to quiz API and renders evidence-backed results', async ({ page }) => {
    const quizRequests: QuizRequest[] = [];
    await mockAutocomplete(page);
    await mockSuccessfulQuiz(page, quizRequests);

    await page.goto('/en/portal');
    const searchInput = page.getByLabel('Search supplements');
    const goButton = page.getByRole('button', { name: 'Go' });
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially('Magnesium');
    await expect(searchInput).toHaveValue('Magnesium');
    await searchInput.press('Escape');
    await expect(goButton).toBeEnabled();
    await goButton.click();

    await expect(page).toHaveURL(/\/(?:en\/)?portal\/results\?q=Magnesium&supplement=Magnesium/);
    await expect(page.getByTestId('recommendation-display')).toBeVisible();

    expect(quizRequests.length).toBeGreaterThanOrEqual(1);
    expect(quizRequests[0]).toMatchObject({
      category: 'magnesium',
      age: 35,
      gender: 'male',
      location: 'CDMX',
    });
    expect(quizRequests[0].jobId).toMatch(/^job_/);
    expect(quizRequests.every((request) => request.category === 'magnesium')).toBe(true);

    await expect(page.getByRole('heading', { name: /Magnesium/i }).first()).toBeVisible();
    await expect(page.getByTestId('study-data-summary')).toContainText('142');
    await expect(page.getByText('Dosificación según Estudios Clínicos')).toBeVisible();
    await expect(page.getByText('200-400 mg elemental magnesium daily')).toBeVisible();
    await expect(page.getByText('Efectos Secundarios Posibles')).toBeVisible();
    await expect(page.getByText('Levothyroxine')).toBeVisible();
    await expect(page.getByText('Product Recommendations')).toBeVisible();
    await expect(page.getByText('Magnesium Glycinate Basic')).toBeVisible();
  });

  test('blocked searches show validation feedback without calling backend', async ({ page }) => {
    let quizCalls = 0;
    await mockAutocomplete(page);
    await page.route('**/api/portal/quiz**', async (route) => {
      quizCalls += 1;
      await route.abort();
    });

    await page.goto('/es/portal');
    await page.getByLabel('Buscar suplementos').fill('pizza');
    await page.getByRole('button', { name: 'Ir' }).click();

    await expect(page.getByText('Esta búsqueda no está permitida')).toBeVisible();
    await expect(page).toHaveURL(/\/es\/portal$/);
    expect(quizCalls).toBe(0);
  });

  test('quiz 404 insufficient-data response renders scientific no-data state', async ({ page }) => {
    await page.route('**/api/portal/quiz**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_data',
          message: 'No encontramos estudios científicos publicados sobre "unknown herb".',
          requestId: 'browser-test-request',
        }),
      });
    });

    await page.goto('/en/portal/results?q=unknown%20herb&supplement=unknown%20herb');

    await expect(page.getByTestId('error-state')).toBeVisible();
    await expect(page.getByText('Sin Evidencia Científica Disponible')).toBeVisible();
    await expect(page.getByText(/unknown herb/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Buscar Otro Suplemento/i })).toBeVisible();
  });
});
