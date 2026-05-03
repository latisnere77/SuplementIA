import { expect, test } from '@playwright/test';

const runRealSearches = process.env.RUN_REAL_SEARCHES === '1';

const searchCases = [
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
  { query: 'sabila', expectedSearchTerm: 'Aloe Vera' },
  { query: 'sábila', expectedSearchTerm: 'Aloe Vera' },
  { query: 'curcuma', expectedSearchTerm: 'Turmeric' },
  { query: 'cúrcuma', expectedSearchTerm: 'Turmeric' },
  { query: 'coenzima q10', expectedSearchTerm: 'Coenzyme Q10' },
  { query: 'melena de león' },
  { query: 'cardo mariano' },
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
];

test.describe('portal real supplement searches', () => {
  test.skip(!runRealSearches, 'Set RUN_REAL_SEARCHES=1 to run live backend search diagnostics.');

  for (const searchCase of searchCases) {
    test(`live result quality for ${searchCase.query}`, async ({ page }) => {
      test.setTimeout(120_000);
      const expectedSearchTerm = searchCase.expectedSearchTerm ?? searchCase.query;

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
            hasDosage: visibleText.includes('Dosificación según Estudios Clínicos'),
            hasSideEffects: visibleText.includes('Efectos Secundarios Posibles'),
            hasProducts: visibleText.includes('Product Recommendations'),
            hasNoEvidence: visibleText.includes('Sin Evidencia Científica Disponible'),
            hasUnsupportedWarning: visibleText.includes('no está respaldada por estudios científicos'),
          },
        }),
      });

      expect.soft(isError, `${searchCase.query} should not render the no-data/system error state`).toBe(false);
      expect.soft(apiResponses.length, `${searchCase.query} should submit one quiz request from the browser flow`).toBe(1);
      expect.soft(latestApiResponse?.status, `${searchCase.query} quiz API status`).toBe(200);
      expect.soft(latestApiResponse?.body?.success, `${searchCase.query} API success flag`).toBe(true);
      expect.soft(latestApiResponse?.body?.recommendation?.evidence_summary?.totalStudies ?? 0, `${searchCase.query} should include study count`).toBeGreaterThan(0);
      expect.soft(visibleText, `${searchCase.query} should render study summary`).toContain('studies');
      expect.soft(visibleText, `${searchCase.query} should render dosage section`).toContain('Dosificación según Estudios Clínicos');
      expect.soft(visibleText, `${searchCase.query} should render products`).toContain('Product Recommendations');
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
      }
    });
  }
});
