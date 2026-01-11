/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withNextIntl = require('next-intl/plugin')();
// Force redeploy with NEXT_PUBLIC_USE_INTELLIGENT_SEARCH env var
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Allow production builds to succeed even with ESLint warnings
    ignoreDuringBuilds: true,
  },
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
  // Webpack config for LanceDB native bindings
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize LanceDB to prevent bundling native .node files
      config.externals.push('@lancedb/lancedb');
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
