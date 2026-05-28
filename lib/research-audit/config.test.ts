import { loadResearchAuditProviderConfig } from './config';

describe('loadResearchAuditProviderConfig', () => {
  it('defaults to disabled dry-run Kimi provider mode', () => {
    const config = loadResearchAuditProviderConfig({});

    expect(config.enabled).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.provider).toBe('kimi');
    expect(config.model).toBe('kimi-k2.6');
    expect(config.endpoint).toBe('https://api.moonshot.ai/v1/chat/completions');
  });

  it('rejects attempts to disable dry-run mode', () => {
    expect(() => loadResearchAuditProviderConfig({ AUDIT_AGENT_DRY_RUN: 'false' })).toThrow();
  });

  it('rejects non-Kimi models for the Kimi provider', () => {
    expect(() => loadResearchAuditProviderConfig({ AUDIT_AGENT_MODEL: 'gpt-5.4-nano' })).toThrow(
      'Kimi provider requires a Kimi model'
    );
  });
});
