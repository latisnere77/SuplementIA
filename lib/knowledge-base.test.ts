import { getAllCategories, getLocalizedCategorySupplements } from './knowledge-base';

describe('knowledge base localization', () => {
  it('keeps every category supplement localized for Spanish and English', () => {
    for (const category of getAllCategories()) {
      const spanishSupplements = getLocalizedCategorySupplements(category, 'es');
      const englishSupplements = getLocalizedCategorySupplements(category, 'en');

      expect(englishSupplements).toHaveLength(category.supplements.length);
      expect(spanishSupplements).toHaveLength(category.supplements.length);

      category.supplements.forEach((sourceSupplement, index) => {
        expect(spanishSupplements[index]).toMatchObject({
          name: sourceSupplement.name,
          summary: sourceSupplement.summary,
        });
        expect(englishSupplements[index].name).toBeTruthy();
        expect(englishSupplements[index].summary).toBeTruthy();
        expect(englishSupplements[index].canonicalQuery).toBeTruthy();
        expect(englishSupplements[index].summary).not.toBe(sourceSupplement.summary);
      });
    }
  });

  it('uses English canonical queries even when Spanish labels are displayed', () => {
    const bloodSugar = getAllCategories().find(category => category.slug === 'blood-sugar');
    expect(bloodSugar).toBeDefined();

    const spanishSupplements = getLocalizedCategorySupplements(bloodSugar!, 'es');
    const berberine = spanishSupplements.find(supplement => supplement.slug === 'berberine');
    const cinnamon = spanishSupplements.find(supplement => supplement.slug === 'cinnamon');

    expect(berberine).toMatchObject({
      name: 'Berberina',
      canonicalQuery: 'Berberine',
    });
    expect(cinnamon).toMatchObject({
      name: 'Canela',
      canonicalQuery: 'Cinnamon',
    });
  });
});
