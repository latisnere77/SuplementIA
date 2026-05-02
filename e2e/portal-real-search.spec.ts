import { expect, test } from '@playwright/test';

const runRealSearches = process.env.RUN_REAL_SEARCHES === '1';

const supplements = [
  'Vitamin B Complex',
  'Vitamin D',
  'Omega-3',
  'Magnesium Glycinate',
  'Creatine',
  'Ashwagandha',
  'Zinc',
  'Collagen',
];

test.describe('portal real supplement searches', () => {
  test.skip(!runRealSearches, 'Set RUN_REAL_SEARCHES=1 to run live backend search diagnostics.');

  for (const supplement of supplements) {
    test(`live result quality for ${supplement}`, async ({ page }) => {
      test.setTimeout(120_000);

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
      await page.getByLabel('Search supplements').fill(supplement);
      await page.getByRole('button', { name: 'Go' }).click();

      await expect(page).toHaveURL(/\/en\/portal\/results\?/);
      const resultUrl = new URL(page.url());
      expect(resultUrl.searchParams.get('q')).toBe(supplement);
      expect(resultUrl.searchParams.get('supplement')).toBe(supplement);

      await expect(
        page.getByTestId('recommendation-display').or(page.getByTestId('error-state'))
      ).toBeVisible({ timeout: 90_000 });

      const isError = await page.getByTestId('error-state').isVisible().catch(() => false);
      const visibleText = await page.locator('body').innerText();
      const latestApiResponse = apiResponses.at(-1);

      test.info().annotations.push({
        type: 'diagnostic',
        description: JSON.stringify({
          supplement,
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

      expect.soft(isError, `${supplement} should not render the no-data/system error state`).toBe(false);
      expect.soft(apiResponses.length, `${supplement} should submit one quiz request from the browser flow`).toBe(1);
      expect.soft(latestApiResponse?.status, `${supplement} quiz API status`).toBe(200);
      expect.soft(latestApiResponse?.body?.success, `${supplement} API success flag`).toBe(true);
      expect.soft(latestApiResponse?.body?.recommendation?.evidence_summary?.totalStudies ?? 0, `${supplement} should include study count`).toBeGreaterThan(0);
      expect.soft(visibleText, `${supplement} should render study summary`).toContain('studies');
      expect.soft(visibleText, `${supplement} should render dosage section`).toContain('Dosificación según Estudios Clínicos');
      expect.soft(visibleText, `${supplement} should render products`).toContain('Product Recommendations');
    });
  }
});
