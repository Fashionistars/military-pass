import * as Sentry from "@sentry/nextjs";

// PostHog client-side initialization is handled by PostHogProvider via lib/posthog-client.ts
// Do NOT import posthog-js here — it auto-injects script tags before api_host can be set

// Export router transition hook for Sentry automatic client-side page transaction tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
