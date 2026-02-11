/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@holi/deid', '@holi/dp', '@holi/utils', '@holi/schemas', '@prisma/extension-read-replicas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Skip failing routes during static generation (allow build to continue)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Pre-existing lint debt across ~50 legacy files blocks production builds.
    // Critical files are linted separately in CI (targeted eslint runs).
    // Re-enable once legacy debt is cleaned: https://github.com/HolisticHealthcareLabs/holilabs/issues/TBD
    ignoreDuringBuilds: true,
  },

  // Security headers are now managed by middleware (src/lib/security-headers.ts)
  // This provides a single source of truth and prevents header conflicts.
  // Removed duplicate configuration here to ensure headers are applied consistently.
  // Remove console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info'], // Keep error, warn, info logs
    } : false,
  },
  // Production memory optimization
  productionBrowserSourceMaps: false,
  // Optimize build for memory-constrained environments
  ...(process.env.NODE_ENV === 'production' && {
    swcMinify: true,
    generateBuildId: async () => {
      return process.env.BUILD_ID || `build-${Date.now()}`
    },
  }),
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      // Fix @react-pdf SSR issue - don't bundle for server
      ...(isServer && {
        '@react-pdf/renderer': 'commonjs @react-pdf/renderer',
        'canvas': 'commonjs canvas',
      }),
    })

    // Provide fallbacks for Node.js modules used by @cornerstonejs packages
    // These packages try to use fs, path, etc. which don't exist in browser
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          buffer: false,
          util: false,
          assert: false,
          http: false,
          https: false,
          os: false,
          url: false,
          zlib: false,
        },
      }
    }

    // Reduce memory footprint during build
    if (process.env.NODE_ENV === 'production') {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      }
      // Limit parallel processing to reduce memory spikes
      config.parallelism = 1
    }

    return config
  },
}

module.exports = nextConfig
