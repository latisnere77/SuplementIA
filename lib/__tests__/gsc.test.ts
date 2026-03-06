// lib/__tests__/gsc.test.ts
// GSC verification token stub — RED until Plan 03 adds verification field to layout
import { metadata } from '@/app/[locale]/layout';

describe('GSC verification (SEO-03)', () => {
  it('layout metadata has non-empty verification.google field', () => {
    const verification = (metadata as Record<string, unknown>).verification as
      | { google?: string }
      | undefined;
    expect(verification).toBeDefined();
    expect(verification?.google).toBeTruthy(); // placeholder counts as truthy
  });
});
