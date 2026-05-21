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
      whereToBuy: 'iHerb Mexico',
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
      whereToBuy: 'iHerb Mexico',
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

  test('Spanish FAQ filters expand answers and final CTA focuses search', async ({ page }) => {
    await page.goto('/es/portal');

    await page.getByRole('button', { name: '🔬 Ciencia', exact: true }).click();
    await expect(page.getByRole('button', { name: /¿De dónde vienen los estudios científicos?/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /¿Qué es SuplementAI?/ })).not.toBeVisible();

    await page.getByRole('button', { name: /¿De dónde vienen los estudios científicos?/ }).click();
    await expect(page.getByText('Todos los estudios provienen de bases de datos biomédicas globales')).toBeVisible();

    await page.getByRole('button', { name: 'Todas' }).click();
    await expect(page.getByRole('button', { name: /¿Qué es SuplementAI?/ })).toBeVisible();

    await page.getByRole('button', { name: 'Explorar Ahora' }).click();
    await expect(page.getByLabel('Buscar suplementos')).toBeFocused();
    await expect(page).toHaveURL(/\/es\/portal$/);
  });

  test('Spanish popular searches keep localized labels but navigate to canonical supplement queries', async ({ page }) => {
    await mockAutocomplete(page);
    await mockSuccessfulQuiz(page);

    const popularSearches = [
      { button: 'Vitamina D Vitaminas', expectedQuery: 'Vitamin(?:%20|\\+)D' },
      { button: 'Omega-3 Ácidos Grasos', expectedQuery: 'Omega-3' },
      { button: 'Magnesio Minerales', expectedQuery: 'Magnesium' },
      { button: 'Proteína Whey Proteínas', expectedQuery: 'Whey(?:%20|\\+)Protein' },
      { button: 'Creatina Rendimiento', expectedQuery: 'Creatine' },
      { button: 'Colágeno Piel y Articulaciones', expectedQuery: 'Collagen' },
    ];

    for (const search of popularSearches) {
      await page.goto('/es/portal');
      const link = page.getByRole('link', { name: search.button });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', new RegExp(`/es/portal/results\\?q=${search.expectedQuery}&supplement=${search.expectedQuery}`));
      await link.click();

      await expect(page).toHaveURL(new RegExp(`/es/portal/results\\?q=${search.expectedQuery}&supplement=${search.expectedQuery}`));
    }
  });

  test('Spanish category cards open localized category pages and supplement results', async ({ page }) => {
    test.setTimeout(90_000);
    await mockAutocomplete(page);
    await mockSuccessfulQuiz(page);

    await page.goto('/es/portal');

    const categoryCards = [
      { name: 'Sueño', slug: 'sleep', supplement: 'Melatonina', expectedQuery: 'Melatonin' },
      { name: 'Energía y Fatiga', slug: 'energy', supplement: 'Cafeína', expectedQuery: 'Caffeine' },
      { name: 'Ansiedad y Estrés', slug: 'anxiety', supplement: 'Ashwagandha', expectedQuery: 'Ashwagandha' },
      { name: 'Ganancia de Músculo y Ejercicio', slug: 'muscle-gain', supplement: 'Proteína de Suero', expectedQuery: 'Whey Protein' },
      { name: 'Memoria y Concentración', slug: 'cognitive-function', supplement: 'Omega-3 (DHA)', expectedQuery: 'Omega-3' },
      { name: 'Salud Cardíaca', slug: 'heart-health', supplement: 'Omega-3 (EPA/DHA)', expectedQuery: 'Omega-3' },
      { name: 'Salud Articular y Ósea', slug: 'joint-bone-health', supplement: 'Vitamina D', expectedQuery: 'Vitamin D' },
      { name: 'Salud Digestiva', slug: 'gut-health', supplement: 'Probióticos', expectedQuery: 'Probiotics' },
      { name: 'Salud de la Piel y Cabello', slug: 'skin-hair-health', supplement: 'Colágeno', expectedQuery: 'Collagen' },
      { name: 'Inmunidad', slug: 'immunity', supplement: 'Vitamina C', expectedQuery: 'Vitamin C' },
      { name: 'Salud Masculina', slug: 'mens-health', supplement: 'Zinc', expectedQuery: 'Zinc' },
      { name: 'Salud Femenina', slug: 'womens-health', supplement: 'Ácido Fólico (Folato)', expectedQuery: 'Folic Acid' },
    ];

    for (const category of categoryCards) {
      await page.goto('/es/portal');
      await page.getByText(category.name, { exact: true }).click();
      await expect(page).toHaveURL(`/es/portal/category/${category.slug}`);
      await expect(page.getByRole('heading', { name: category.name })).toBeVisible();

      const backLink = page.getByRole('link', { name: 'Volver a Búsqueda' });
      await expect(backLink).toHaveAttribute('href', '/es/portal');

      await page.locator('a').filter({ hasText: category.supplement }).first().click();
      await expect(page).toHaveURL(/\/es\/portal\/results\?/);

      const resultUrl = new URL(page.url());
      expect(resultUrl.searchParams.get('q')).toBe(category.expectedQuery);
      expect(resultUrl.searchParams.get('supplement')).toBe(category.expectedQuery);
      expect(resultUrl.searchParams.get('benefit')).toBe(category.slug);
    }
  });

  test('English category pages render localized category headings', async ({ page }) => {
    await page.goto('/en/portal/category/sleep');

    await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();
    await expect(page.getByText('Supplements studied for sleep quality and duration.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Melatonin' })).toBeVisible();
    await expect(page.getByText('Hormone that regulates the sleep-wake cycle.')).toBeVisible();
    await expect(page.getByText('Melatonina')).not.toBeVisible();
    await expect(page.getByText('Hormona que regula el ciclo sueño-vigilia.')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Search' })).toHaveAttribute('href', '/en/portal');
  });

  test('category pages keep card language consistent in Spanish and English', async ({ page }) => {
    const localizedCases = [
      {
        url: '/es/portal/category/inflammation',
        heading: 'Inflamación',
        expected: ['Curcumina', 'Jengibre', 'Compuesto activo de la cúrcuma estudiado por efectos antiinflamatorios.'],
        forbidden: ['Curcumin', 'Ginger', 'Active turmeric compound studied for anti-inflammatory effects.'],
      },
      {
        url: '/en/portal/category/inflammation',
        heading: 'Inflammation',
        expected: ['Curcumin', 'Ginger', 'Active turmeric compound studied for anti-inflammatory effects.'],
        forbidden: ['Curcumina', 'Jengibre', 'Compuesto activo de la cúrcuma estudiado por efectos antiinflamatorios.'],
      },
      {
        url: '/es/portal/category/blood-sugar',
        heading: 'Control de Glucosa',
        expected: ['Berberina', 'Canela', 'Alcaloide vegetal estudiado por sus efectos en glucosa'],
        forbidden: ['Berberine', 'Cinnamon', 'Plant alkaloid studied for effects on glucose'],
      },
      {
        url: '/en/portal/category/blood-sugar',
        heading: 'Blood Sugar Control',
        expected: ['Berberine', 'Cinnamon', 'Plant alkaloid studied for effects on glucose'],
        forbidden: ['Berberina', 'Canela', 'Alcaloide vegetal estudiado por sus efectos en glucosa'],
      },
    ];

    for (const localizedCase of localizedCases) {
      await page.goto(localizedCase.url);
      await expect(page.getByRole('heading', { name: localizedCase.heading })).toBeVisible();

      for (const text of localizedCase.expected) {
        await expect(page.getByText(text).first()).toBeVisible();
      }

      for (const text of localizedCase.forbidden) {
        await expect(page.getByText(text, { exact: true }).first()).not.toBeVisible();
      }
    }
  });

  test('supplement detail shell follows the selected locale', async ({ page }) => {
    await page.route('**/api/portal/enrich-simple', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          evidence: {
            overallGrade: 'B',
            summary: 'Evidence summary',
            worksFor: [],
            doesntWorkFor: [],
            limitedEvidence: [],
            studyCount: 4,
            rctCount: 2,
          },
        }),
      });
    });

    await page.goto('/en/portal/supplement/magnesium?benefit=sleep');
    await expect(page.getByRole('link', { name: 'Back to Sleep' })).toHaveAttribute('href', '/en/portal/category/sleep');
    await expect(page.getByRole('heading', { name: /Scientific Evidence for Magnesium/i })).toBeVisible();
    await expect(page.getByText('Focused on:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByText('Evidencia Científica para')).not.toBeVisible();

    await page.goto('/es/portal/supplement/magnesium?benefit=sleep');
    await expect(page.getByRole('link', { name: 'Volver a Sueño' })).toHaveAttribute('href', '/es/portal/category/sleep');
    await expect(page.getByRole('heading', { name: /Evidencia Científica para Magnesio/i })).toBeVisible();
    await expect(page.getByText('Enfocado en:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();
    await expect(page.getByText('Scientific Evidence for')).not.toBeVisible();
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
    await expect(page.getByText('Dosage in Clinical Studies')).toBeVisible();
    await expect(page.getByText('200-400 mg elemental magnesium daily')).toBeVisible();
    await expect(page.getByText('Possible Side Effects')).toBeVisible();
    await expect(page.getByText('Levothyroxine')).toBeVisible();
    await expect(page.getByText('Product Recommendations')).toBeVisible();
    await expect(page.getByText('Search Magnesium Glycinate on iHerb')).toBeVisible();
    await expect(page.getByText('Magnesium Glycinate Basic')).not.toBeVisible();
  });

  test('results render iHerb affiliate card only for clear supplement matches', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, '__openedUrls', {
        value: [],
        writable: true,
      });

      window.open = (url?: string | URL) => {
        (window as typeof window & { __openedUrls: string[] }).__openedUrls.push(String(url));
        return null;
      };
    });

    await page.route('**/api/portal/quiz**', async (route) => {
      const body = route.request().postDataJSON() as QuizRequest;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          searchType: 'ingredient',
          jobId: body.jobId,
          recommendation: {
            ...recommendation,
            products: [],
          },
        }),
      });
    });

    await page.goto('/en/portal/results?q=Magnesium&supplement=Magnesium');

    await expect(page.getByTestId('recommendation-display')).toBeVisible();
    await expect(page.getByText('Product Recommendations')).toBeVisible();
    await expect(page.getByText('SuplementAI may earn from qualifying purchases through affiliate links')).toBeVisible();
    await expect(page.getByText('Search Magnesium Glycinate on iHerb')).toBeVisible();
    await expect(page.getByText('View on iHerb')).toHaveCount(2);

    await page.getByRole('button', { name: /View on iHerb/i }).click();

    await expect(page.getByText('Unlock Pro Features')).not.toBeVisible();
    const openedUrls = await page.evaluate(() => (window as typeof window & { __openedUrls: string[] }).__openedUrls);
    expect(openedUrls[0]).toContain('https://mx.iherb.com/search?');
    expect(openedUrls[0]).toContain('kw=magnesium');
  });

  test('results do not render affiliate products for broad health goals without clear ingredient matches', async ({ page }) => {
    await page.route('**/api/portal/quiz**', async (route) => {
      const body = route.request().postDataJSON() as QuizRequest;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          searchType: 'ingredient',
          jobId: body.jobId,
          recommendation: {
            ...recommendation,
            category: 'sleep',
            evidence_summary: {
              ...recommendation.evidence_summary,
              ingredients: [],
            },
            supplement: {
              ...recommendation.supplement,
              name: 'sleep',
            },
            products: [],
          },
        }),
      });
    });

    await page.goto('/en/portal/results?q=sleep&supplement=sleep');

    await expect(page.getByTestId('recommendation-display')).toBeVisible();
    await expect(page.getByText('Product Recommendations')).not.toBeVisible();
    await expect(page.getByText('iHerb')).not.toBeVisible();
  });

  test('search submission polls until async enrichment returns final evidence', async ({ page }) => {
    const quizRequests: QuizRequest[] = [];
    let statusCalls = 0;

    await mockAutocomplete(page);
    await page.route('**/api/portal/quiz**', async (route) => {
      const body = route.request().postDataJSON() as QuizRequest;
      quizRequests.push(body);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'processing',
          jobId: body.jobId,
          recommendation: {
            ...recommendation,
            supplement: {
              ...recommendation.supplement,
              worksFor: [],
            },
          },
        }),
      });
    });

    await page.route('**/api/portal/status/**', async (route) => {
      statusCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: statusCalls === 1 ? 'processing' : 'completed',
          recommendation: statusCalls === 1 ? undefined : recommendation,
        }),
      });
    });

    await page.goto('/en/portal/results?q=Magnesium&supplement=Magnesium');

    await expect.poll(() => quizRequests.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    expect(quizRequests.every((request) => request.jobId === quizRequests[0].jobId)).toBe(true);
    await expect.poll(() => statusCalls, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('recommendation-display')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Sleep quality').first()).toBeVisible();
    await expect(page.getByText('No hay beneficios con evidencia clínica A/B confirmada en PubMed')).not.toBeVisible();
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
          message: 'Encontramos literatura publicada sobre "unknown herb" en PubMed, pero no evidencia clínica humana suficiente para confirmar beneficios.',
          requestId: 'browser-test-request',
          metadata: {
            literatureProfile: {
              totalCount: 3,
              sampledCount: 3,
              categories: {
                human_clinical: 0,
                review: 1,
                preclinical: 1,
                phytochemical: 1,
                other: 0,
              },
              articles: [
                {
                  pmid: '12345',
                  title: 'Chemical composition of unknown herb essential oil',
                  year: 2025,
                  category: 'phytochemical',
                  publicationTypes: ['Journal Article'],
                },
                {
                  pmid: '67890',
                  title: 'Unknown herb extract in rat model',
                  year: 2024,
                  category: 'preclinical',
                  publicationTypes: ['Journal Article'],
                },
                {
                  pmid: '13579',
                  title: 'Unknown herb field use report',
                  year: 2023,
                  category: 'other',
                  publicationTypes: ['Journal Article'],
                },
              ],
            },
          },
        }),
      });
    });

    await page.goto('/en/portal/results?q=unknown%20herb&supplement=unknown%20herb');

    await expect(page.getByTestId('error-state')).toBeVisible();
    await expect(page.getByText('Not Enough Human Clinical Evidence')).toBeVisible();
    await expect(page.getByText(/^PubMed does contain literature related/i)).toBeVisible();
    await expect(page.getByText('PubMed Results')).toBeVisible();
    await expect(page.getByText('Reviewed Sample', { exact: true })).toBeVisible();
    await expect(page.getByText('What type of literature appeared in the sample')).toBeVisible();
    await expect(page.getByText('Studies in people')).toBeVisible();
    await expect(page.getByText('Animals, cells, or laboratory work')).toBeVisible();
    await expect(page.getByText('Composition or chemical characterization')).toBeVisible();
    await expect(page.getByText('Representative articles from the sample')).toBeVisible();
    await expect(page.getByText('This list is not a recommendation.')).toBeVisible();
    await expect(page.getByText('Chemical composition of unknown herb essential oil')).toBeVisible();
    await expect(page.getByText('Unknown herb extract in rat model')).toBeVisible();
    await expect(page.getByText('Unknown herb field use report')).toBeVisible();
    await expect(page.getByRole('link', { name: /PMID 12345/i })).toHaveAttribute('href', /pubmed\.ncbi\.nlm\.nih\.gov\/12345/);
    await expect(page.getByText(/No encontramos estudios científicos publicados en PubMed/i)).not.toBeVisible();
    await expect(page.getByText(/Preclinical, phytochemical, botanical, or agricultural literature is not/i)).toBeVisible();
    await expect(page.getByText('Next exploratory searches')).toBeVisible();
    await expect(page.getByText('These actions are for refining the search. They do not imply')).toBeVisible();
    await expect(page.getByRole('button', { name: /Try another name/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Search components/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Explore a specific topic/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to popular supplements/i })).toBeVisible();
    await expect(page.getByText(/Explore supplement \+ condition only as a search/i)).toBeVisible();
    await expect(page.getByText(/sirve para/i)).not.toBeVisible();
    await expect(page.getByText(/treats|cures/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Search Another Supplement/i })).toBeVisible();
  });

  test('supplement URL does not crash when API returns condition-shaped payload', async ({ page }) => {
    await page.route('**/api/portal/quiz**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          searchType: 'condition',
          condition: 'Piper auritum',
          summary: 'Análisis enriquecido completo. Se encontraron 1 suplementos relevantes.',
          supplementsByEvidence: {
            gradeA: [],
            gradeB: [],
            gradeC: [],
            gradeD: [
              {
                supplementName: 'Omega-3',
                overallGrade: 'D',
                totalStudyCount: 1,
                benefits: [],
              },
            ],
          },
        }),
      });
    });

    await page.goto('/en/portal/results?q=Piper%20auritum&supplement=Piper%20auritum');

    await expect(page.getByTestId('error-state')).toBeVisible();
    await expect(page.getByText('Not Enough Human Clinical Evidence')).toBeVisible();
    await expect(page.getByText(/No encontramos estudios científicos publicados en PubMed/i)).not.toBeVisible();
    await expect(page.getByText(/^We did not find enough human clinical evidence to recommend benefits for "piper auritum"\./i)).toBeVisible();
    await expect(page.getByText(/sirve para/i)).not.toBeVisible();
    await expect(page.getByText(/treats|cures/i)).not.toBeVisible();
    await expect(page.getByText('This page couldn’t load')).not.toBeVisible();
  });

  test('supplement detail page has SEO metadata and keeps dynamic evidence flow', async ({ page }) => {
    await page.route('**/api/portal/enrich-simple', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          evidence: {
            overallGrade: 'B',
            description: 'Magnesium is an essential mineral involved in normal physiology.',
            worksFor: [
              {
                condition: 'Sleep quality',
                grade: 'B',
                description: 'Studied in people with low magnesium intake.',
              },
            ],
            doesntWorkFor: [],
            limitedEvidence: [],
            ingredients: [
              {
                name: 'Magnesium',
                grade: 'B',
                studyCount: 12,
                rctCount: 4,
              },
            ],
            qualityBadges: {
              hasRCTs: true,
              hasMetaAnalysis: false,
              longTermStudies: false,
              safetyEstablished: true,
            },
          },
          metadata: {
            studiesUsed: 12,
            searchTerm: 'Magnesium',
          },
        }),
      });
    });

    await page.goto('/en/portal/supplement/magnesium');

    await expect(page).toHaveTitle(/Magnesium: evidence, studies, and safety/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://suplementai.com/en/portal/supplement/magnesium');
    await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', 'https://suplementai.com/es/portal/supplement/magnesium');
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://suplementai.com/en/portal/supplement/magnesium');
    await expect(page.getByRole('heading', { name: /Scientific Evidence for Magnesium/i })).toBeVisible();
    await expect(page.getByText('Sleep quality').first()).toBeVisible();

    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent || '').join('\n'));

    expect(structuredData).toContain('"@type":"MedicalWebPage"');
    expect(structuredData).toContain('"@type":"DietarySupplement"');
    expect(structuredData).toContain('https://suplementai.com/en/portal/supplement/magnesium');
    expect(structuredData).not.toMatch(/sirve para|treats|cures|beneficio comprobado|clinical benefit/i);
  });
});
