/** @jest-environment node */
// Validates: I18N-01, I18N-05

import * as fs from 'fs';

describe('I18N-01 / I18N-05: Routing stays in current locale', () => {
  describe('portal/page.tsx', () => {
    const content = fs.readFileSync('app/[locale]/portal/page.tsx', 'utf-8');

    it('does not import useRouter from next/navigation', () => {
      expect(content).not.toMatch(/useRouter.*from ['"]next\/navigation['"]/);
    });

    it('imports useRouter from @/src/i18n/navigation', () => {
      expect(content).toMatch(/useRouter.*from ['"]@\/src\/i18n\/navigation['"]/);
    });
  });

  describe('portal/results/page.tsx', () => {
    const content = fs.readFileSync('app/[locale]/portal/results/page.tsx', 'utf-8');

    it('does not import useRouter from next/navigation', () => {
      expect(content).not.toMatch(/useRouter.*from ['"]next\/navigation['"]/);
    });

    it('imports useRouter from @/src/i18n/navigation', () => {
      expect(content).toMatch(/useRouter.*from ['"]@\/src\/i18n\/navigation['"]/);
    });
  });

  describe('PortalHeader.tsx', () => {
    const content = fs.readFileSync('components/portal/PortalHeader.tsx', 'utf-8');

    it('does not import useRouter from next/navigation', () => {
      expect(content).not.toMatch(/useRouter.*from ['"]next\/navigation['"]/);
    });

    it('imports useRouter from @/src/i18n/navigation', () => {
      expect(content).toMatch(/useRouter.*from ['"]@\/src\/i18n\/navigation['"]/);
    });
  });
});
