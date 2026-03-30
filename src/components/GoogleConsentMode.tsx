"use client";

import { useEffect } from "react";
import Script from "next/script";

import { useCookieConsent } from "@/components/CookieConsent";

type ConsentAwareWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function updateConsent(analyticsEnabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const consentWindow = window as ConsentAwareWindow;

  if (typeof consentWindow.gtag !== "function") {
    consentWindow.dataLayer = consentWindow.dataLayer || [];
    consentWindow.gtag = (...args: unknown[]) => {
      consentWindow.dataLayer?.push(args);
    };
  }

  consentWindow.gtag("consent", "update", {
    analytics_storage: analyticsEnabled ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    personalization_storage: "denied",
    security_storage: "granted",
  });
}

export function GoogleConsentMode() {
  const { consent, loaded } = useCookieConsent();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !loaded) {
      return;
    }

    updateConsent(Boolean(consent?.analytics));
  }, [loaded, consent?.analytics]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <Script id="google-consent-mode" strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = window.gtag || gtag;
        window.gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          functionality_storage: 'granted',
          personalization_storage: 'denied',
          security_storage: 'granted',
          wait_for_update: 500
        });
      `}
    </Script>
  );
}