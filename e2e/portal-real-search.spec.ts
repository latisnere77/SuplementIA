import { expect, test } from '@playwright/test';

const runRealSearches = process.env.RUN_REAL_SEARCHES === '1';

type ExpectedOutcome = 'recommendation' | 'insufficient_data';

type SearchCase = {
  query: string;
  expectedSearchTerm?: string;
  expectedOutcome?: ExpectedOutcome;
};

const searchCases: SearchCase[] = [
  { query: 'Vitamin B Complex' },
  { query: 'Vitamin D' },
  { query: 'Omega-3' },
  { query: 'Magnesium' },
  { query: 'Magnesium Glycinate' },
  { query: 'Creatine' },
  { query: 'Ashwagandha' },
  { query: 'Zinc' },
  { query: 'Collagen' },

  // Spanish common names, accented names, and aliases.
  { query: 'magnesio', expectedSearchTerm: 'Magnesium' },
  { query: 'vitamina d', expectedSearchTerm: 'Vitamin D' },
  { query: 'berberina', expectedSearchTerm: 'Berberine' },
  { query: 'sabila', expectedSearchTerm: 'Aloe Vera' },
  { query: 'sábila', expectedSearchTerm: 'Aloe Vera' },
  { query: 'curcuma', expectedSearchTerm: 'Turmeric' },
  { query: 'cúrcuma', expectedSearchTerm: 'Turmeric' },
  { query: 'coenzima q10', expectedSearchTerm: 'Coenzyme Q10' },
  { query: 'melena de león', expectedSearchTerm: "Lion's Mane" },
  { query: 'cardo mariano', expectedSearchTerm: 'Milk thistle' },
  { query: 'té verde', expectedSearchTerm: 'Green tea extract' },
  { query: 'valeriana' },

  // Scientific names and English common aliases.
  { query: 'aloe barbadensis' },
  { query: 'withania', expectedSearchTerm: 'Ashwagandha' },
  { query: 'withania somnifera' },
  { query: 'panax ginseng', expectedSearchTerm: 'Ginseng' },
  { query: 'korean ginseng', expectedSearchTerm: 'Ginseng' },
  { query: 'valeriana officinalis' },
  { query: 'hericium erinaceus' },
  { query: 'ginkgo biloba' },
  { query: 'silybum marianum' },
  { query: 'resveratrol', expectedSearchTerm: 'Resveratrol' },

  // Less common/trendy supplement names that should not fall through to unrelated catalog entries.
  { query: 'berberine', expectedSearchTerm: 'Berberine' },
  { query: 'berberina', expectedSearchTerm: 'Berberine' },
  { query: 'tongkat ali' },
  { query: 'fadogia agrestis', expectedOutcome: 'insufficient_data' },
  { query: 'sea moss' },
  { query: 'musgo marino' },
  { query: 'shilajit' },
  { query: 'black seed oil' },
  { query: 'aceite de comino negro' },
  { query: 'bacopa monnieri' },
];

test.describe('portal real supplement searches', () => {
  test.skip(!runRealSearches, 'Set RUN_REAL_SEARCHES=1 to run live backend search diagnostics.');

  for (const searchCase of searchCases) {
    test(`live result quality for ${searchCase.query}`, async ({ page }) => {
      test.setTimeout(120_000);
      const expectedSearchTerm = searchCase.expectedSearchTerm ?? searchCase.query;
      const expectedOutcome = searchCase.expectedOutcome ?? 'recommendation';

      const apiResponses: Array<{ status: number; url: string; body?: any }> = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('/api/portal/quiz') && !url.includes('lambda-url')) {
          return;
        }

        let body: any;
        try {
          body = await response.json();
        } catch {
          body = undefined;
        }

        apiResponses.push({
          status: response.status(),
          url,
          body,
        });
      });

      await page.goto('/en/portal');
      const searchInput = page.getByLabel('Search supplements');
      const goButton = page.getByRole('button', { name: 'Go' });

      await searchInput.click();
      await searchInput.fill('');
      await searchInput.pressSequentially(searchCase.query);
      await expect(searchInput).toHaveValue(searchCase.query);
      await searchInput.press('Escape');
      await expect(goButton).toBeEnabled();
      await goButton.click();

      await expect(page).toHaveURL(/\/en\/portal\/results\?/);
      const resultUrl = new URL(page.url());
      expect(resultUrl.searchParams.get('q')).toBe(expectedSearchTerm);
      expect(resultUrl.searchParams.get('supplement')).toBe(expectedSearchTerm);

      await expect(
        page.getByTestId('recommendation-display').or(page.getByTestId('error-state'))
      ).toBeVisible({ timeout: 90_000 });

      const isError = await page.getByTestId('error-state').isVisible().catch(() => false);
      const visibleText = await page.locator('body').innerText();
      const latestApiResponse = apiResponses.at(-1);

      test.info().annotations.push({
        type: 'diagnostic',
        description: JSON.stringify({
          query: searchCase.query,
          expectedSearchTerm,
          expectedOutcome,
          isError,
          apiStatus: latestApiResponse?.status,
          apiUrl: latestApiResponse?.url,
          searchType: latestApiResponse?.body?.searchType,
          success: latestApiResponse?.body?.success,
          recommendationCategory: latestApiResponse?.body?.recommendation?.category,
          totalStudies: latestApiResponse?.body?.recommendation?.evidence_summary?.totalStudies,
          hasSupplement: Boolean(latestApiResponse?.body?.recommendation?.supplement),
          visibleSignals: {
            hasStudySummary: visibleText.includes('Based on') || visibleText.includes('basada'),
            hasDosage: visibleText.includes('Dosage in Clinical Studies') || visibleText.includes('Dosificación según Estudios Clínicos'),
            hasSideEffects: visibleText.includes('Possible Side Effects') || visibleText.includes('Efectos Secundarios Posibles'),
            hasProducts: visibleText.includes('Product Recommendations'),
            hasNoEvidence: visibleText.includes('Sin Evidencia Clínica Humana Suficiente') ||
              visibleText.includes('Not Enough Human Clinical Evidence'),
            hasUnsupportedWarning: visibleText.includes('no está respaldada por estudios científicos'),
          },
        }),
      });

      if (expectedOutcome === 'insufficient_data') {
        expect.soft(isError, `${searchCase.query} should render the controlled no-data state`).toBe(true);
        expect.soft(apiResponses.length, `${searchCase.query} should submit one quiz request from the browser flow`).toBe(1);
        expect.soft(latestApiResponse?.status, `${searchCase.query} quiz API status`).toBe(404);
        expect.soft(latestApiResponse?.body?.error, `${searchCase.query} API error code`).toBe('insufficient_data');
        expect.soft(
          visibleText.includes('Not Enough Human Clinical Evidence') ||
            visibleText.includes('Sin Evidencia Clínica Humana Suficiente'),
          `${searchCase.query} should explain insufficient human clinical evidence`
        ).toBe(true);
        expect.soft(visibleText, `${searchCase.query} should not expose backend internals`).not.toContain('backend_service_error');
        expect.soft(visibleText, `${searchCase.query} should not expose backend internals`).not.toContain('Internal Server Error');
        expect.soft(visibleText, `${searchCase.query} should not expose backend internals`).not.toContain('Function not found');
        expect.soft(
          visibleText,
          `${searchCase.query} insufficient-data state should not make unsafe clinical claims`
        ).not.toMatch(/sirve para|treats|cures|beneficio comprobado|clinical benefit/i);
        expect.soft(visibleText, `${searchCase.query} insufficient-data state should not render products`).not.toContain('Product Recommendations');
        expect.soft(visibleText, `${searchCase.query} insufficient-data state should not render affiliate links`).not.toContain('iHerb');
        return;
      }

      expect.soft(isError, `${searchCase.query} should not render the no-data/system error state`).toBe(false);
      expect.soft(apiResponses.length, `${searchCase.query} should submit one quiz request from the browser flow`).toBe(1);
      expect.soft(latestApiResponse?.status, `${searchCase.query} quiz API status`).toBe(200);
      expect.soft(latestApiResponse?.body?.success, `${searchCase.query} API success flag`).toBe(true);
      expect.soft(latestApiResponse?.body?.recommendation?.evidence_summary?.totalStudies ?? 0, `${searchCase.query} should include study count`).toBeGreaterThan(0);
      expect.soft(
        visibleText.includes('studies') ||
          visibleText.includes('Selected clinical evidence') ||
          visibleText.includes('Evidencia clínica seleccionada'),
        `${searchCase.query} should render evidence provenance`
      ).toBe(true);
        expect.soft(
          visibleText.includes('Dosage in Clinical Studies') || visibleText.includes('Dosificación según Estudios Clínicos'),
          `${searchCase.query} should render dosage section`
        ).toBe(true);
      expect.soft(visibleText, `${searchCase.query} should not expose local catalog internals`).not.toContain('catálogo local');
      expect.soft(visibleText, `${searchCase.query} should not expose local catalog internals`).not.toContain('catalogo local');
      expect.soft(visibleText, `${searchCase.query} should not expose local catalog internals`).not.toContain('local catalog');

      if (searchCase.query === 'Magnesium') {
        expect.soft(visibleText, 'Magnesium definition should describe the mineral').toContain('essential mineral');
        expect.soft(visibleText, 'Magnesium definition should not expose condition tags').not.toContain('sleep, muscles, cramps, stress, energy');
        expect.soft(visibleText, 'Magnesium overview should not expose raw condition tags').not.toContain('Más estudiado para: sleep');
        expect.soft(visibleText, 'Magnesium benefit list should not expose raw condition tags').not.toContain('\nsleep\n');
        expect.soft(visibleText, 'Magnesium worksFor should not show catalog-derived preliminary claims').not.toContain('Evidencia preliminar encontrada');
        expect.soft(visibleText, 'Magnesium worksFor should not promote grade C placeholders').not.toContain('Sleep quality\n🟡\nC');
        expect.soft(
          visibleText.includes('Correct low intake or magnesium deficiency') ||
            visibleText.includes('Corregir ingesta baja o deficiencia de magnesio'),
          'Magnesium should render curated grade B benefits'
        ).toBe(true);
        expect.soft(
          visibleText.includes('Prevent migraine in some people') ||
            visibleText.includes('Prevenir migraña en algunas personas'),
          'Magnesium should render migraine evidence'
        ).toBe(true);
      }

      const unrelatedCatalogTerms: Record<string, string[]> = {
        'tongkat ali': ['Valerian', 'Valeriana'],
        'sea moss': ['Rhodiola'],
        'musgo marino': ['Rhodiola'],
        'black seed oil': ['Flaxseed'],
        'aceite de comino negro': ['Aceite de Coco', 'Coconut Oil'],
      };

      for (const unrelatedTerm of unrelatedCatalogTerms[searchCase.query] || []) {
        expect.soft(visibleText, `${searchCase.query} should not render unrelated ${unrelatedTerm} catalog text`).not.toContain(unrelatedTerm);
      }
    });
  }
});
