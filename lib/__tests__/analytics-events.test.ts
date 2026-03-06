// lib/__tests__/analytics-events.test.ts
// Analytics event stubs — RED state until Plan 04 adds track() calls
// These will be replaced with full integration assertions post-implementation

jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));

describe('Vercel Analytics custom events (SEO-03)', () => {
  it.todo('track("search_submitted") called with {query, locale} when portal search submitted');
  it.todo('track("supplement_view") called with {supplement, locale} when results page mounts with data');
  it.todo('track("result_click") called with {supplement, from} when supplement card clicked');
});
