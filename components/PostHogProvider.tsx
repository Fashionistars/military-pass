"use client";

import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Disable PostHog in development to avoid 404 errors
    if (process.env.NODE_ENV === "development") {
      console.log("PostHog analytics disabled in development mode");
      return;
    }

    // Initialize PostHog only in production
    if (typeof window !== "undefined") {
      // PostHog initialization for production would go here
      console.log("PostHog would be initialized in production");
    }
  }, []);

  return <>{children}</>;
}
