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
  eslint: {
    // ESLint 9 + Next.js 14.2 legacy config conflict causes build failures.
    // Disable during builds; run `npm run lint` manually in CI or pre-commit.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],

  // Increase body limit for file uploads (blog images up to 5MB)
  serverBodyLimit: 10 * 1024 * 1024, // 10MB

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        pathname: '/prompt/**',
      },
      {
        protocol: 'https',
        hostname: 'pollinations.ai',
        pathname: '/**',
      },
    ],
  },

  // Security headers for all public responses
  async headers() {
    return [
      {
        // Apply to everything except Next.js internals and static assets
        source: '/((?!_next/static|_next/image|favicon|apple-touch-icon|site.webmanifest|robots.txt|sitemap.xml|og-default).*)',
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
      // Info pages: legacy short URLs → actual /info/* routes
      {
        source: '/contact',
        destination: '/info/contact',
        permanent: false,
      },
      {
        source: '/about',
        destination: '/info/about',
        permanent: false,
      },
      {
        source: '/privacy',
        destination: '/info/privacy',
        permanent: false,
      },
      {
        source: '/terms',
        destination: '/info/terms',
        permanent: false,
      },
      {
        source: '/cookies',
        destination: '/info/cookies',
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
