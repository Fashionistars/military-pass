/**
 * @fileoverview Next.js webpack and server configuration.
 * Integrates security headers, standalone output builds, and wraps the
 * entire configuration with Sentry Next.js SDK for server/client error logging.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

// Conditionally load Sentry only when a token is available.
// On HF Spaces (no SENTRY_AUTH_TOKEN) we skip the require entirely
// to avoid webpack wrapper failures during `next build`.
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;
const { withSentryConfig } = hasSentryToken
  ? require("@sentry/nextjs")
  : { withSentryConfig: null };

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Performance & Standalone Build ───────────────────────
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ── Image optimization remote schemas ─────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ── HTTP Security headers (app-level only; deployment-level in vercel.json) ──
  // X-Frame-Options, X-Content-Type-Options, HSTS are set in vercel.json.
  // Here we set only app-specific headers to avoid conflicts.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
        ],
      },
    ];
  },

  // ── Experimental next features ───────────────────────────
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },

  // ── Rewrite PostHog ingest routes to avoid 404 errors ─────
  async rewrites() {
    return [
      {
        source: "/ingest/:path*",
        destination: "https://us.posthog.com/:path*",
      },
    ];
  },
};

// Wrap Next.js config with Sentry error monitoring integration.
// Skip Sentry wrapper when SENTRY_AUTH_TOKEN is absent (e.g. HF Spaces builds)
// to avoid webpack build failures from source map upload errors.
module.exports = hasSentryToken
  ? withSentryConfig(
      nextConfig,
      {
        // Webpack plugin options: suppress logs and specify org/project context
        silent: true,
        org: "military-fanz",
        project: "javascript-nextjs",
      },
      {
        // SDK options: enable client source maps and tunnel routes
        widenClientFileUpload: true,
        transpileClientSDK: true,
        tunnelRoute: "/monitoring",
        hideSourceMaps: true,
        disableLogger: true,
      }
    )
  : nextConfig;
