/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@holi/deid', '@holi/dp', '@holi/utils', '@holi/schemas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
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
    })

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
