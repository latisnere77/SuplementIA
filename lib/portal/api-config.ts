/**
 * Portal API Configuration
 * Shared configuration and URL normalization
 */

/**
 * Get the portal API base URL from environment variables
 * Cleans newlines, carriage returns, and trailing slashes
 */
export function getPortalApiUrl(): string {
  const url = (process.env.PORTAL_API_URL || 'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging')
    .trim()
    .replace(/\n/g, '')
    .replace(/\r/g, '');
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const PORTAL_API_URL = getPortalApiUrl();
