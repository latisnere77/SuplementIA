/**
 * Portal API Configuration
 * Shared configuration and URL normalization
 */

/**
 * Get the portal API base URL from environment variables
 * Cleans newlines, carriage returns, and trailing slashes
 * Validates URL format and ensures proper construction
 */
export function getPortalApiUrl(): string {
  const defaultUrl = 'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';
  const envUrl = process.env.PORTAL_API_URL;
  
  // If explicitly disabled, return empty (will trigger demo mode)
  if (envUrl === 'DISABLED' || envUrl === 'false') {
    return '';
  }
  
  // Use environment variable or default
  const url = (envUrl || defaultUrl)
    .trim()
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s+/g, ''); // Remove all whitespace
  
  // Remove trailing slash
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // Validate URL format
  try {
    new URL(normalizedUrl);
  } catch (error) {
    console.error('⚠️ [API Config] Invalid PORTAL_API_URL format:', normalizedUrl);
    console.error('⚠️ [API Config] Using default URL:', defaultUrl);
    return defaultUrl.replace(/\/$/, ''); // Remove trailing slash from default too
  }
  
  return normalizedUrl;
}

export const PORTAL_API_URL = getPortalApiUrl();

// Log configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 [API Config] PORTAL_API_URL:', PORTAL_API_URL || '(demo mode)');
  console.log('🔧 [API Config] PORTAL_API_URL env:', process.env.PORTAL_API_URL || '(not set, using default)');
}
