import {
  DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID,
  DEFAULT_MOONSHOT_SECRET_ID,
  loadResearchAuditGitHubIssueToken,
  loadResearchAuditProviderApiKey,
} from './aws-secret-loader';

describe('loadResearchAuditProviderApiKey', () => {
  it('does not call Secrets Manager unless explicitly enabled', async () => {
    const getSecretValue = jest.fn();

    const key = await loadResearchAuditProviderApiKey({ enabled: false, getSecretValue });

    expect(key).toBeUndefined();
    expect(getSecretValue).not.toHaveBeenCalled();
  });

  it('prefers an existing local provider key over Secrets Manager', async () => {
    const getSecretValue = jest.fn();

    const key = await loadResearchAuditProviderApiKey({
      enabled: true,
      existingApiKey: 'local-key',
      getSecretValue,
    });

    expect(key).toBe('local-key');
    expect(getSecretValue).not.toHaveBeenCalled();
  });

  it('loads a plain-text Moonshot key from the expected default secret', async () => {
    const getSecretValue = jest.fn().mockResolvedValue(' moonshot-secret-key ');

    const key = await loadResearchAuditProviderApiKey({
      enabled: true,
      getSecretValue,
      env: { AWS_REGION: 'us-west-2' },
    });

    expect(key).toBe('moonshot-secret-key');
    expect(getSecretValue).toHaveBeenCalledWith({
      secretId: DEFAULT_MOONSHOT_SECRET_ID,
      region: 'us-west-2',
    });
  });

  it('loads a JSON-wrapped Moonshot key without exposing the secret value', async () => {
    const getSecretValue = jest.fn().mockResolvedValue(JSON.stringify({ MOONSHOT_API_KEY: 'json-moonshot-key' }));

    const key = await loadResearchAuditProviderApiKey({
      enabled: true,
      secretId: 'custom/moonshot',
      region: 'us-east-1',
      getSecretValue,
    });

    expect(key).toBe('json-moonshot-key');
    expect(getSecretValue).toHaveBeenCalledWith({
      secretId: 'custom/moonshot',
      region: 'us-east-1',
    });
  });
});

describe('loadResearchAuditGitHubIssueToken', () => {
  it('does not call Secrets Manager unless explicitly enabled', async () => {
    const getSecretValue = jest.fn();

    const token = await loadResearchAuditGitHubIssueToken({ enabled: false, getSecretValue });

    expect(token).toBeUndefined();
    expect(getSecretValue).not.toHaveBeenCalled();
  });

  it('prefers an existing local GitHub token over Secrets Manager', async () => {
    const getSecretValue = jest.fn();

    const token = await loadResearchAuditGitHubIssueToken({
      enabled: true,
      existingToken: 'local-github-token',
      getSecretValue,
    });

    expect(token).toBe('local-github-token');
    expect(getSecretValue).not.toHaveBeenCalled();
  });

  it('loads a JSON-wrapped GitHub token from the expected default secret', async () => {
    const getSecretValue = jest.fn().mockResolvedValue(JSON.stringify({
      GITHUB_ISSUE_TOKEN: 'github-issue-token',
    }));

    const token = await loadResearchAuditGitHubIssueToken({
      enabled: true,
      getSecretValue,
      env: { AWS_REGION: 'us-west-2' },
    });

    expect(token).toBe('github-issue-token');
    expect(getSecretValue).toHaveBeenCalledWith({
      secretId: DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID,
      region: 'us-west-2',
    });
  });
});
