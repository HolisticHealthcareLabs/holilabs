/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  output: 'standalone',
};

module.exports = nextConfig;
