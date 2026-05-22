/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withNextIntl = require('next-intl/plugin')();
// Force redeploy with NEXT_PUBLIC_USE_INTELLIGENT_SEARCH env var
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
    ],
  },
  turbopack: {
    resolveAlias: {
      'js-cookie': './lib/auth/js-cookie-compat.js',
    },
  },
  // Webpack config for LanceDB native bindings
  webpack: (config, { isServer, nextRuntime }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'js-cookie$': require.resolve('./lib/auth/js-cookie-compat.js'),
    };

    if (isServer && nextRuntime !== 'edge') {
      // Externalize server-only SDKs to prevent bundling native files and AWS SDK ESM subpath issues.
      config.externals.push('@lancedb/lancedb');
      config.externals.push(({ request }, callback) => {
        if (
          /^@aws-sdk\//.test(request) ||
          /^@smithy\//.test(request) ||
          /^@opentelemetry\//.test(request) ||
          /^@sentry\//.test(request)
        ) {
          return callback(null, `commonjs ${request}`);
        }

        callback();
      });
    }

    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },
}

module.exports = withNextIntl(nextConfig)
