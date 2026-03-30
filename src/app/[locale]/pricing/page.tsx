"use client";

import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/billing/PricingCard";
import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [currentMembership, setCurrentMembership] = useState<string>("basic");
  const [trialDays, setTrialDays] = useState<number | undefined>(undefined);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const t = useTranslations("pricing");
  const tBilling = useTranslations("billing");
  const tCheckout = useTranslations("checkout");
  const locale = useLocale();

  const [termsAgreed, setTermsAgreed] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setToast({
        type: "error",
        message: tBilling("errorMessages.checkoutFailed"),
      });
    }
  }, [searchParams, tBilling]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/subscription")
        .then((res) => res.json())
        .then((data) => {
          if (data.membership) {
            setCurrentMembership(data.membership);
          }
          if (data.trialDays !== undefined) {
            setTrialDays(data.trialDays);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const handleUpgrade = async (tier: "premium" | "pro") => {
    if (status !== "authenticated") {
      router.push("/signin?callbackUrl=/pricing");
      return;
    }

    // Check legal consent
    if (!termsAgreed || !digitalConsent) {
      setShowConsentError(true);
      return;
    }
    setShowConsentError(false);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          locale,
          sourcePage: "pricing",
          surface: "pricing_page",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({
          type: "error",
          message: data.error || tBilling("errorMessages.checkoutFailed"),
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
    }
  };

  const [isManaging, setIsManaging] = useState(false);

  const handleManageSubscription = async () => {
    if (status !== "authenticated") return;

    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({
          type: "error",
          message: data.error || tBilling("errorMessages.generic"),
        });
        setIsManaging(false);
      }
    } catch (error) {
      console.error("Portal error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
      setIsManaging(false);
    }
  };

  return (
    <div className="min-h-screen bg-eatrivo-white-primary relative overflow-hidden">
      <TrackPageEvent
        eventName="pricing_viewed"
        metadata={{ locale, entrypoint: "direct", surface: "pricing_page" }}
      />
      {/* Subtle background ambient blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-eatrivo-purple/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-eatrivo-pink/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-eatrivo-black-secondary hover:text-eatrivo-black-primary rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back", { defaultValue: "Back" })}
          </Button>
        </motion.div>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 rounded-xl p-4 text-center text-sm font-medium ${
              toast.type === "success"
                ? "bg-eatrivo-green/10 text-eatrivo-green border border-eatrivo-green/20"
                : "bg-eatrivo-red/10 text-eatrivo-red border border-eatrivo-red/20"
            }`}
          >
            {toast.message}
          </motion.div>
        )}

        {/* Hero header */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-eatrivo-black-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-xl text-base text-eatrivo-black-secondary/80 leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2 items-start">
          <PricingCard
            tier="basic"
            price="Free"
            isCurrentPlan={currentMembership === "basic"}
          />
          <PricingCard
            tier="premium"
            price={4.99}
            isPopular
            isCurrentPlan={currentMembership === "premium"}
            onSelect={() => handleUpgrade("premium")}
            trialDays={trialDays}
            ctaOverride={tCheckout("legalConsent.orderWithPayment")}
          />
        </div>

        {/* Legal consent checkboxes */}
        {status === "authenticated" && currentMembership === "basic" && (
          <motion.div
            className="mx-auto mt-10 max-w-3xl rounded-xl border border-eatrivo-purple/10 bg-eatrivo-white-primary p-5 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => {
                    setTermsAgreed(e.target.checked);
                    if (e.target.checked) setShowConsentError(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-eatrivo-purple accent-eatrivo-purple flex-shrink-0"
                />
                <span className="text-sm text-eatrivo-black-secondary leading-relaxed">
                  {tCheckout.rich("legalConsent.termsAgree", {
                    terms: (chunks) => (
                      <a
                        href={`/${locale}/terms-of-service`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eatrivo-purple underline hover:text-eatrivo-purple/80"
                      >
                        {chunks}
                      </a>
                    ),
                    privacy: (chunks) => (
                      <a
                        href={`/${locale}/privacy-policy`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eatrivo-purple underline hover:text-eatrivo-purple/80"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={digitalConsent}
                  onChange={(e) => {
                    setDigitalConsent(e.target.checked);
                    if (e.target.checked) setShowConsentError(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-eatrivo-purple accent-eatrivo-purple flex-shrink-0"
                />
                <span className="text-sm text-eatrivo-black-secondary leading-relaxed">
                  {tCheckout("legalConsent.digitalConsent")}
                </span>
              </label>
            </div>

            {showConsentError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 text-sm text-eatrivo-red"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{tCheckout("legalConsent.mustAgree")}</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Trust footer */}
        <motion.div
          className="mt-14 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {status === "authenticated" &&
          (currentMembership === "premium" || currentMembership === "pro") ? (
            <Button
              onClick={handleManageSubscription}
              disabled={isManaging}
              className="rounded-xl border-2 border-eatrivo-purple/40 bg-eatrivo-white-primary hover:border-eatrivo-purple/80 text-eatrivo-black-secondary hover:text-eatrivo-black-primary"
            >
              {isManaging ? t("managingSubscription") : t("manageSubscription")}
            </Button>
          ) : (
            status !== "authenticated" && (
              <p className="text-sm text-eatrivo-black-secondary/60">
                {t("signInToUpgrade")}
              </p>
            )
          )}

          {/* Trust signals */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-eatrivo-black-secondary/50">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>
                {t("trustCancel", { defaultValue: "Cancel anytime" })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>
                {t("trustSecure", { defaultValue: "Secure via Stripe" })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
