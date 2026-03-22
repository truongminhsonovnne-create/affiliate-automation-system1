/**
 * @type {import('next').NextConfig}
 *
 * Production-ready config. All host-specific values are driven by
 * environment variables so the same build works in dev, staging, and prod.
 *
 * Required env vars (copy from .env.example):
 *   NEXT_PUBLIC_SITE_URL         — Canonical base URL (e.g. https://voucherfinder.app)
 *   NEXT_PUBLIC_INTERNAL_API_URL — Internal API base (e.g. http://localhost:3000 in standalone)
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],

  // Exclude the monorepo root's src/ directory from the Pages Router
  // error page build traces. In this monorepo, the parent D:/Affiliate/src/
  // contains App Router hybrid files that conflict during Pages Router
  // pre-render for /404 and /500.
  experimental: {
    outputFileTracingExcludes: {
      '/**': ['../../../src/**'],
    },
  },

  // Security headers for all public responses
  async headers() {
    return [
      {
        // Apply to everything except Next.js internals and static assets
        source: '/((?!_next/static|_next/image|favicon|apple-touch-icon|robots.txt|sitemap.xml|og-default).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Root → /home (main user-facing entry point)
      {
        source: '/',
        destination: '/home',
        permanent: false,
      },
    ];
  },

  // Proxy internal API calls through Next.js so the internal URL
  // never leaks to the browser.  The INTERNAL_API_URL env var should
  // point to the actual backend (e.g. http://backend:3001 in Docker,
  // or http://localhost:3001 in local dev with a separate backend process).
  //
  // NOTE: /api/internal/sync/* routes are handled by local Next.js API routes
  // (src/app/api/internal/sync/*), so they are NOT rewritten here.
  async rewrites() {
    // /api/internal/sync/* routes are handled by local Next.js API routes
    // (src/app/api/internal/sync/*). No rewrite needed for those.
    return [];
  },
};

module.exports = nextConfig;
