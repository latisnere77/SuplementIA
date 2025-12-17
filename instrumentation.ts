/**
 * Next.js Instrumentation Hook
 * 
 * This file runs at application startup, BEFORE any other code.
 * Used to sanitize environment variables that have trailing whitespace/newlines
 * injected by Vercel's environment variable editor.
 * 
 * ROOT CAUSE: AWS SDK's internal `environmentVariableSelector` reads
 * `process.env.AWS_REGION` directly, bypassing any `.trim()` in client constructors.
 * This causes "Region not accepted" errors when the env var has trailing whitespace.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Sanitize AWS environment variables at startup
    // This MUST happen before any AWS SDK code is imported
    const envVarsToSanitize = [
        'AWS_REGION',
        'AWS_DEFAULT_REGION',
        'AWS_ROLE_ARN',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_SESSION_TOKEN',
    ];

    for (const envVar of envVarsToSanitize) {
        if (process.env[envVar]) {
            const original = process.env[envVar];
            const sanitized = original!.trim();

            if (original !== sanitized) {
                console.log(`[Instrumentation] Sanitized ${envVar}: removed trailing whitespace`);
                process.env[envVar] = sanitized;
            }
        }
    }

    // Log confirmation
    console.log('[Instrumentation] AWS environment variables sanitized successfully');
    console.log(`[Instrumentation] AWS_REGION is now: "${process.env.AWS_REGION}"`);
}
