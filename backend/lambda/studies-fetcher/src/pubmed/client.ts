/**
 * PubMed API Client
 * Handles rate limiting and API key management
 */

import { config } from '../config';

export class PubMedClient {
  private lastRequestTime = 0;
  private readonly minDelay: number;

  constructor() {
    // With API key: 10 req/sec (100ms delay)
    // Without API key: 3 req/sec (334ms delay)
    this.minDelay = config.pubmedApiKey ? 100 : 334;
  }

  /**
   * Make a rate-limited request to PubMed
   */
  async request(url: string): Promise<Response> {
    await this.throttle();

    const urlWithKey = this.addApiKey(url);

    console.log(JSON.stringify({
      event: 'PUBMED_REQUEST',
      url: url.substring(0, 100),
      timestamp: new Date().toISOString(),
    }));

    const response = await fetch(urlWithKey);

    if (!response.ok) {
      throw new Error(`PubMed request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Throttle requests to respect rate limits
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Add API key to URL if available
   */
  private addApiKey(url: string): string {
    if (!config.pubmedApiKey) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}api_key=${config.pubmedApiKey}`;
  }

  /**
   * Build base URL for E-utilities
   */
  buildUrl(endpoint: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params);
    return `${config.pubmedBaseUrl}/${endpoint}.fcgi?${searchParams.toString()}`;
  }
}

// Singleton instance
export const pubmedClient = new PubMedClient();
