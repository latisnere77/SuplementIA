/**
 * @jest-environment node
 */
import { buildCategorySeoContent, buildCategorySeoCopy } from './seo';

const unsafePattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;

describe('category page SEO', () => {
  it('builds targeted metadata for priority category pages', () => {
    expect(
      buildCategorySeoCopy({
        slug: 'sleep',
        categoryName: 'Sleep',
        categoryDescription: 'Supplements studied for sleep quality and duration.',
        locale: 'en',
      })
    ).toMatchObject({
      title: 'Supplements for sleep: evidence, safety, and options',
    });

    expect(
      buildCategorySeoCopy({
        slug: 'cholesterol-triglycerides',
        categoryName: 'Colesterol y Trigliceridos',
        categoryDescription: 'Opciones estudiadas para lípidos.',
        locale: 'es',
      }).description
    ).toContain('omega-3');
  });

  it('adds localized editorial content for priority category pages', () => {
    const sleepContent = buildCategorySeoContent('sleep', 'en');
    const lipidContent = buildCategorySeoContent('cholesterol-triglycerides', 'en');
    const heartContent = buildCategorySeoContent('heart-health', 'es');

    expect(sleepContent?.intro).toContain('sleep quality');
    expect(sleepContent?.faqs).toHaveLength(3);
    expect(lipidContent?.intro).toContain('psyllium fiber');
    expect(lipidContent?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'fiber-psyllium',
      'omega-3',
      'plant-sterols',
    ]);
    expect(heartContent?.supplementLinksHeading).toBe('Guías de suplementos cardiovasculares');
  });

  it('does not add generic SEO content for non-priority categories', () => {
    expect(buildCategorySeoContent('gut-health', 'en')).toBeNull();
  });

  it('keeps priority category SEO copy free of unsafe clinical wording', () => {
    const serialized = JSON.stringify([
      buildCategorySeoContent('sleep', 'en'),
      buildCategorySeoContent('cholesterol-triglycerides', 'en'),
      buildCategorySeoContent('heart-health', 'es'),
    ]);

    expect(serialized).not.toMatch(unsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });
});
