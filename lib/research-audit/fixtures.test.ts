import { loadAuditFixtures } from './fixtures';

describe('loadAuditFixtures', () => {
  it('loads provider fixtures from docs', () => {
    const fixtures = loadAuditFixtures();

    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.map((fixture) => fixture.id)).toEqual(
      expect.arrayContaining([
        'garcinia-insufficient-data-recall-risk',
        'centella-alias-recall',
      ])
    );
  });

  it('keeps fixtures free of direct worksFor literals after cleanup', () => {
    const fixtures = loadAuditFixtures();
    const serialized = JSON.stringify(fixtures);

    expect(serialized).not.toContain('worksFor');
    expect(serialized).not.toContain('remove worksFor');
  });
});

