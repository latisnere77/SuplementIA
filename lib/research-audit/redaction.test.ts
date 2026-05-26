import { redactAuditQuery } from './redaction';

describe('redactAuditQuery', () => {
  it('rejects email, phone, and URLs before an external provider could see them', () => {
    const result = redactAuditQuery('ashwagandha user@example.com +1 555 123 4567 https://example.com?a=b');

    expect(result.allowed).toBe(false);
    expect(result.redactedQuery).toBeUndefined();
    expect(result.rejectionReasons.join(' ')).toContain('email');
    expect(result.rejectionReasons.join(' ')).toContain('phone');
    expect(result.rejectionReasons.join(' ')).toContain('URL');
  });

  it('marks multiline text as rejected', () => {
    const result = redactAuditQuery('magnesium\nmedical story');

    expect(result.allowed).toBe(false);
    expect(result.rejectionReasons).toContain('query contains multiple lines');
  });

  it('allows short supplement-like queries and returns a fingerprint', () => {
    const result = redactAuditQuery('Garcinia Cambogia');

    expect(result.allowed).toBe(true);
    expect(result.redactedQuery).toBe('Garcinia Cambogia');
    expect(result.queryFingerprint).toMatch(/^[a-f0-9]{16}$/);
  });
});
