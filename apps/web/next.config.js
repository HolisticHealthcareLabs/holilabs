/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@logtail/node': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
