"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings, Check, X } from "lucide-react";

export type CookiePreferences = {
  essential: true; // always true
  analytics: boolean;
};

const COOKIE_CONSENT_KEY = "cookie-consent";
const COOKIE_CONSENT_VERSION = "1";

function getCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed.preferences;
  } catch {
    return null;
  }
}

function saveCookieConsent(preferences: CookiePreferences) {
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      version: COOKIE_CONSENT_VERSION,
      preferences,
      timestamp: new Date().toISOString(),
    })
  );

  // Dispatch custom event for other components to react
  window.dispatchEvent(
    new CustomEvent("cookie-consent-changed", { detail: preferences })
  );
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(getCookieConsent());
    setLoaded(true);

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<CookiePreferences>;
      setConsent(customEvent.detail);
    };
    window.addEventListener("cookie-consent-changed", handler);
    return () => window.removeEventListener("cookie-consent-changed", handler);
  }, []);

  return { consent, loaded, hasConsent: consent !== null };
}

export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const prefs: CookiePreferences = { essential: true, analytics: true };
    saveCookieConsent(prefs);
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    const prefs: CookiePreferences = { essential: true, analytics: false };
    saveCookieConsent(prefs);
    setVisible(false);
  }, []);

  const saveCustom = useCallback(() => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: analyticsChecked,
    };
    saveCookieConsent(prefs);
    setVisible(false);
  }, [analyticsChecked]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10">
            <div className="p-5 md:p-6">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-eatrivo-purple/10 flex-shrink-0">
                  <Cookie className="h-4.5 w-4.5 text-eatrivo-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-eatrivo-black-primary">
                    {t("title")}
                  </h3>
                  <p className="mt-1 text-sm text-eatrivo-black-secondary/80 leading-relaxed">
                    {t("description")}
                  </p>
                </div>
              </div>

              {/* Details panel */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 space-y-3 rounded-xl bg-gray-50 p-4">
                      {/* Essential - always on */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-eatrivo-black-primary">
                            {t("essential.title")}
                          </p>
                          <p className="text-xs text-eatrivo-black-secondary/70">
                            {t("essential.description")}
                          </p>
                        </div>
                        <div className="flex h-6 w-11 items-center rounded-full bg-eatrivo-green/80 px-0.5 cursor-not-allowed">
                          <div className="h-5 w-5 rounded-full bg-white shadow translate-x-5" />
                        </div>
                      </div>

                      <div className="border-t border-gray-200" />

                      {/* Analytics - toggleable */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-eatrivo-black-primary">
                            {t("analytics.title")}
                          </p>
                          <p className="text-xs text-eatrivo-black-secondary/70">
                            {t("analytics.description")}
                          </p>
                        </div>
                        <button
                          onClick={() => setAnalyticsChecked(!analyticsChecked)}
                          className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                            analyticsChecked
                              ? "bg-eatrivo-purple"
                              : "bg-gray-300"
                          }`}
                          role="switch"
                          aria-checked={analyticsChecked}
                        >
                          <div
                            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              analyticsChecked
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {showDetails ? (
                  <button
                    onClick={saveCustom}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-eatrivo-purple px-4 py-2.5 text-sm font-bold text-white hover:bg-eatrivo-purple/90 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    {t("savePreferences")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={acceptAll}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-eatrivo-purple px-4 py-2.5 text-sm font-bold text-white hover:bg-eatrivo-purple/90 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      {t("acceptAll")}
                    </button>
                    <button
                      onClick={rejectAll}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-eatrivo-black-secondary hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      {t("rejectAll")}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-eatrivo-black-secondary hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  {t("customize")}
                </button>
              </div>

              {/* Cookie policy link */}
              <p className="mt-3 text-center text-xs text-eatrivo-black-secondary/60">
                {t("learnMore")}{" "}
                <a
                  href="/cookie-policy"
                  className="text-eatrivo-purple hover:underline font-medium"
                >
                  {t("cookiePolicy")}
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Re-open cookie consent banner — call this from footer "Cookie Settings" link
 */
export function reopenCookieConsent() {
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  window.dispatchEvent(new CustomEvent("cookie-consent-reopen"));
  // Force page reload to show banner
  window.location.reload();
}
