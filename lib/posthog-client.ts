"use client";

let posthogInstance: any = null;
let isInitialized = false;

export async function initPostHog() {
  if (isInitialized || typeof window === "undefined") return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  if (!token) {
    return;
  }

  const { default: posthog } = await import("posthog-js");
  posthogInstance = posthog;

  posthog.init(token, {
    api_host: "https://us.posthog.com",
    autocapture: false,
    disable_session_recording: true,
    capture_exceptions: false,
    capture_pageview: false,
    capture_pageleave: false,
    persistence: "localStorage",
    loaded: () => {
      isInitialized = true;
    },
  });
}

function safeCapture(event: string, properties?: Record<string, any>) {
  if (!isInitialized || !posthogInstance || typeof window === "undefined") return;
  try {
    posthogInstance.capture(event, properties);
  } catch {}
}

function safeIdentify(distinctId: string, properties?: Record<string, any>) {
  if (!isInitialized || !posthogInstance || typeof window === "undefined") return;
  try {
    posthogInstance.identify(distinctId, properties);
  } catch {}
}

function safeCaptureException(error: Error) {
  if (!isInitialized || !posthogInstance || typeof window === "undefined") return;
  try {
    posthogInstance.captureException(error);
  } catch {}
}

export const analytics = {
  capture: safeCapture,
  identify: safeIdentify,
  captureException: safeCaptureException,
};
