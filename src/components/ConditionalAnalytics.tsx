"use client";

import { useCookieConsent } from "./CookieConsent";
import { GaProvider } from "@/components/analytics/GaProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

/**
 * Consent-aware analytics provider gate for all third-party analytics.
 */
export function ConditionalAnalytics() {
  const { consent, loaded } = useCookieConsent();

  // Don't render until we've checked consent
  if (!loaded) return null;

  // Only render Analytics if user has opted in
  if (!consent?.analytics) return null;

  return (
    <>
      <GaProvider />
      <PostHogProvider />
    </>
  );
}
