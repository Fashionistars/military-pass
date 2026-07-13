"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    if (typeof window !== "undefined") {
      const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

      if (!token) {
        console.warn("[PostHog] No project token found — analytics disabled");
        return;
      }

      posthog.init(token, {
        api_host: host,
        api_path: "/ingest",
        autocapture: false,
        disable_session_recording: true,
        disable_exception_autocapture: true,
        capture_pageview: false,
        capture_pageleave: false,
        persistence: "localStorage",
        loaded: () => {
          console.log("[PostHog] Initialized successfully");
        },
      });
    }
  }, []);

  return <>{children}</>;
}
