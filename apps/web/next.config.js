/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@holi/deid', '@holi/dp', '@holi/utils', '@holi/schemas'],
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
    ignoreDuringBuilds: false,
  },

  // Security headers for HIPAA compliance and production hardening
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (formerly Feature-Policy)
          // Disable access to sensitive browser APIs for privacy and security
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',              // No camera access
              'microphone=()',          // No microphone access
              'geolocation=()',         // No geolocation access
              'interest-cohort=()',     // No FLoC tracking
              'usb=()',                 // No USB device access
              'bluetooth=()',           // No Bluetooth access
              'magnetometer=()',        // No magnetometer access
              'accelerometer=()',       // No accelerometer access
              'gyroscope=()',           // No gyroscope access
              'payment=()',             // No Payment Request API
              'midi=()',                // No MIDI device access
              'speaker-selection=()',   // No speaker selection
              'sync-xhr=()',            // No synchronous XMLHttpRequest
              'fullscreen=(self)',      // Fullscreen only from same origin
              'screen-wake-lock=()',    // No screen wake lock
              'web-share=()',           // No Web Share API
              'display-capture=()',     // No screen capture
            ].join(', '),
          },
          // Strict-Transport-Security (HSTS) - force HTTPS
          // Only enable this after confirming HTTPS works in production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // X-XSS-Protection (legacy but still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Content-Security-Policy (CSP)
          // NOTE: This is a strict policy. Monitor console for violations and adjust as needed.
          // Use 'unsafe-inline' and 'unsafe-eval' temporarily if needed, then tighten.
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: deny all, then explicitly allow
              "default-src 'self'",
              // Scripts: allow self, inline scripts (Next.js requirement), and eval for dev
              process.env.NODE_ENV === 'production'
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: allow self and inline styles (Tailwind, styled-components)
              "style-src 'self' 'unsafe-inline'",
              // Images: allow self, data URLs (base64), and trusted CDNs
              "img-src 'self' data: https:",
              // Fonts: allow self and data URLs
              "font-src 'self' data:",
              // Connect (AJAX, WebSocket): allow self and API endpoints
              "connect-src 'self' https://api.holilabs.xyz https://*.anthropic.com https://*.deepgram.com https://*.upstash.io",
              // Frames: deny all (redundant with X-Frame-Options, but defense in depth)
              "frame-ancestors 'none'",
              // Forms: only allow submission to self
              "form-action 'self'",
              // Prevent loading mixed content (HTTP resources on HTTPS page)
              "upgrade-insecure-requests",
              // Base URI restriction
              "base-uri 'self'",
              // Object/Embed: deny all (Flash, Java applets)
              "object-src 'none'",
              // Reporting: send CSP violation reports to endpoint
              "report-uri https://api.holilabs.xyz/security-reports",
              "report-to default",
            ]
              .filter(Boolean)
              .join('; '),
          },
          // X-DNS-Prefetch-Control - control DNS prefetching for privacy
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          // X-Permitted-Cross-Domain-Policies - prevent Adobe Flash/PDF from loading content
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          // Cross-Origin-Embedder-Policy - prevent loading cross-origin resources without CORS
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          // Cross-Origin-Opener-Policy - isolate browsing context from cross-origin windows
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Cross-Origin-Resource-Policy - prevent cross-origin no-cors requests
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Report-To - endpoint for security violation reports (CSP, COEP, COOP, etc.)
          {
            key: 'Report-To',
            value: JSON.stringify({
              group: 'default',
              max_age: 31536000,
              endpoints: [{ url: 'https://api.holilabs.xyz/security-reports' }],
            }),
          },
          // NEL (Network Error Logging) - report network failures
          {
            key: 'NEL',
            value: JSON.stringify({
              report_to: 'default',
              max_age: 31536000,
              include_subdomains: true,
            }),
          },
        ],
      },
    ];
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
      // Fix @react-pdf SSR issue - don't bundle for server
      ...(isServer && {
        '@react-pdf/renderer': 'commonjs @react-pdf/renderer',
        'canvas': 'commonjs canvas',
      }),
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
