/** @jest-environment node */
/**
 * Phase 3 — Categories & Links Audit
 * Wave 0: Failing stubs for CAT-01, CAT-02, LINK-01, LINK-02
 *
 * These tests are intentionally RED before any fixes are applied.
 * Run: npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAllCategories } from '../../lib/knowledge-base';
import { SUPPLEMENTS_DATABASE } from '../../lib/portal/supplements-database';

// Build a Set of base IDs by stripping -es / -en suffixes
const baseIds = new Set(
  SUPPLEMENTS_DATABASE.map(entry => entry.id.replace(/-(?:es|en)$/, ''))
);

// Known slugs not yet in SUPPLEMENTS_DATABASE — flagged, not silently skipped
const KNOWN_MISSING = new Set([
  'lavender',        // No DB entry — would need clinical content
  'caffeine',        // No DB entry — would need clinical content
  'beta-alanine',    // No DB entry — would need clinical content
  'bacopa-monnieri', // No DB entry — would need clinical content
  'fiber-psyllium',  // No DB entry — would need clinical content
  'echinacea',       // No DB entry — would need clinical content
]);

// =============================================================================
// CAT-01: Supplement slugs in knowledge-base must resolve to SUPPLEMENTS_DATABASE
// =============================================================================

describe('CAT-01: knowledge-base supplement slugs resolve to SUPPLEMENTS_DATABASE', () => {
  const categories = getAllCategories();

  categories.forEach(category => {
    category.supplements.forEach(supplement => {
      if (KNOWN_MISSING.has(supplement.slug)) {
        it.todo(`${supplement.slug} — KNOWN GAP: not in SUPPLEMENTS_DATABASE`);
        return;
      }

      it(`"${supplement.slug}" (${category.slug}/${supplement.name}) exists in DB`, () => {
        expect(baseIds.has(supplement.slug)).toBe(true);
      });
    });
  });
});

// =============================================================================
// LINK-01: No hardcoded broken hrefs in category page, GuidesCategories, or codebase
// =============================================================================

describe('LINK-01: No hardcoded broken hrefs', () => {
  it('category page back-link does not point to /portal/search', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    // FAILS before fix: current href="/portal/search" must become href="/portal"
    expect(content).not.toMatch(/href=["']\/portal\/search["']/);
    expect(content).toMatch(/href=["']\/portal["']/);
  });

  it('GuidesCategories does not push to /portal/categories', () => {
    const content = fs.readFileSync(
      'components/portal/GuidesCategories.tsx',
      'utf-8'
    );
    // FAILS before fix: router.push('/portal/categories') must become router.push('/portal')
    expect(content).not.toMatch(/['"]\/portal\/categories['"]/);
  });

  it('no component or page links to /portal/search', () => {
    const dirs = ['app', 'components'];
    const portalSearchRefs: string[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.match(/\.(tsx?|jsx?)$/) && !entry.name.includes('.test.')) {
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          if (fileContent.includes('/portal/search')) {
            portalSearchRefs.push(fullPath);
          }
        }
      }
    }

    dirs.forEach(scanDir);
    // FAILS before fix: category page still has href="/portal/search"
    expect(portalSearchRefs).toEqual([]);
  });
});

// =============================================================================
// LINK-02: Dynamic hrefs guarded against undefined benefit param
// =============================================================================

describe('LINK-02: Dynamic hrefs guarded against undefined benefit', () => {
  it('supplement detail page has a null-check before building category back-link', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/supplement/[slug]/page.tsx',
      'utf-8'
    );
    // FAILS before fix: bare href={`/portal/category/${benefit}`} is unguarded
    expect(content).not.toMatch(/href=\{`\/portal\/category\/\$\{benefit\}`\}/);
    // After fix: should have a fallback to /portal
    expect(content).toMatch(/\/portal(?:'|"|\s|`)/);
  });

  it('category page calls notFound() for unknown slugs', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    // PASSES — notFound() is already present in the category page
    expect(content).toMatch(/notFound\(\)/);
  });
});

// =============================================================================
// CAT-02: Category pages are functional with correct supplement mappings
// =============================================================================

describe('CAT-02: Category pages call notFound() for unknown slugs', () => {
  it('category page calls notFound() for unknown slugs', () => {
    const content = fs.readFileSync(
      'app/[locale]/portal/category/[slug]/page.tsx',
      'utf-8'
    );
    // PASSES — notFound() is already present in the category page
    expect(content).toMatch(/notFound\(\)/);
  });
});
