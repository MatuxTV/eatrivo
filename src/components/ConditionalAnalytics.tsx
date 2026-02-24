"use client";

import { Analytics } from "@vercel/analytics/next";
import { useCookieConsent } from "./CookieConsent";

/**
 * Wrapper around Vercel Analytics that only loads when the user
 * has given cookie consent for analytics cookies.
 */
export function ConditionalAnalytics() {
  const { consent, loaded } = useCookieConsent();

  // Don't render until we've checked consent
  if (!loaded) return null;

  // Only render Analytics if user has opted in
  if (!consent?.analytics) return null;

  return <Analytics />;
}
