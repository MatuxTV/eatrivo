"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CreditCard,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";

import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { PricingCard } from "@/components/billing/PricingCard";
import { Button } from "@/components/ui/button";

interface ProfileBillingSectionProps {
  embedded?: boolean;
}

export default function ProfileBillingSection({
  embedded = true,
}: ProfileBillingSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations("pricing");
  const tBilling = useTranslations("billing");
  const billingHomePath = "/home?section=profile&profileView=billing";

  const [currentMembership, setCurrentMembership] = useState<string>("basic");
  const [trialDays, setTrialDays] = useState<number | undefined>(undefined);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const plansRef = useRef<HTMLDivElement | null>(null);

  const resolvedMembership =
    currentMembership === "premium" || currentMembership === "pro"
      ? currentMembership
      : "basic";
  const isPaidMember =
    resolvedMembership === "premium" || resolvedMembership === "pro";
  const isAuthenticated = status === "authenticated";
  const currentPlanName = t(`tiers.${resolvedMembership}.name`);
  const heroActionLabel = isPaidMember
    ? t("manageSubscription")
    : t("upgrade");
  const availableUpgradeTiers = useMemo(() => {
    if (resolvedMembership === "basic") {
      return ["premium"] as const;
    }

    return [] as const;
  }, [resolvedMembership]);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setToast({
        type: "error",
        message: tBilling("errorMessages.checkoutFailed"),
      });
    }
  }, [searchParams, tBilling]);


  const handleHeroAction = async () => {
    if (isPaidMember) {
      await handleManageSubscription();
      return;
    }

    if (!isAuthenticated) {
      router.push(`/${locale}/signin?callbackUrl=${encodeURIComponent(billingHomePath)}`);
      return;
    }

    await handleUpgrade("premium");
  };
  useEffect(() => {
    if (!session?.user) {
      return;
    }

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
  }, [session]);

  const handleUpgrade = async (tier: "premium" | "pro") => {
    if (status !== "authenticated") {
      router.push(`/${locale}/signin?callbackUrl=${encodeURIComponent(billingHomePath)}`);
      return;
    }

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          locale,
          sourcePage: embedded ? "profile-billing" : "pricing",
          surface: embedded ? "profile_billing" : "pricing_page",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setToast({
        type: "error",
        message: data.error || tBilling("errorMessages.checkoutFailed"),
      });
    } catch (error) {
      console.error("Checkout error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
    }
  };

  const handleManageSubscription = async () => {
    if (status !== "authenticated") {
      return;
    }

    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setToast({
        type: "error",
        message: data.error || tBilling("errorMessages.generic"),
      });
      setIsManaging(false);
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
    <div
      className={embedded ? "space-y-5 sm:space-y-6" : "min-h-screen bg-eatrivo-white-primary relative overflow-hidden"}
    >
      <TrackPageEvent
        eventName="pricing_viewed"
        metadata={{
          locale,
          entrypoint: embedded ? "profile" : "direct",
          surface: embedded ? "profile_billing" : "pricing_page",
        }}
      />

      {embedded ? null : (
        <>
          <div className="absolute top-0 left-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-eatrivo-purple/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-eatrivo-pink/5 blur-3xl pointer-events-none" />
        </>
      )}

      <div className={embedded ? "space-y-5" : "container mx-auto relative z-10 px-4 py-12 md:py-16"}>
        {embedded ? null : (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-8 flex items-center gap-2 rounded-xl text-eatrivo-black-secondary hover:text-eatrivo-black-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {tBilling("back")}
            </Button>
          </motion.div>
        )}

        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 text-center text-sm font-medium ${
              toast.type === "success"
                ? "border-eatrivo-green/20 bg-eatrivo-green/10 text-eatrivo-green"
                : "border-eatrivo-red/20 bg-eatrivo-red/10 text-eatrivo-red"
            } ${embedded ? "" : "mb-8"}`}
          >
            {toast.message}
          </motion.div>
        ) : null}

        <motion.div
          className={
            embedded
              ? "rounded-[2rem] border border-[#f0e0cd] bg-[#fff8f1] p-5 shadow-[0_20px_50px_rgba(211,164,111,0.14)] sm:p-6"
              : "mb-14 rounded-[2.25rem] border border-[#f0e0cd] bg-[#fff8f1] p-8 text-left shadow-[0_20px_50px_rgba(211,164,111,0.12)]"
          }
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {embedded ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16d38]">
                    {tBilling("profileSection.membershipEyebrow")}
                  </p>
                  <h1 className="text-[1.9rem] font-black tracking-[-0.05em] text-[#2f1e12] sm:text-[2.15rem]">
                    {t("title")}
                  </h1>
                  <p className="max-w-2xl text-sm font-medium leading-6 text-[#7a6553]">
                    {tBilling("profileSection.description")}
                  </p>
                </div>

                <div className="hidden rounded-[1.4rem] border border-[#ecd7c0] bg-white px-4 py-3 text-right sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16d38]">
                    {tBilling("profileSection.currentPlanLabel")}
                  </p>
                  <p className="mt-1 text-base font-black tracking-[-0.04em] text-[#2f1e12]">
                    {currentPlanName}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-[#ecd7c0] bg-white p-4 shadow-[0_14px_30px_rgba(160,109,56,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8ead7] text-[#a16d38]">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16d38]">
                      {tBilling("profileSection.yourMembershipLabel")}
                    </p>
                    <p className="mt-1 truncate text-xl font-black tracking-[-0.05em] text-[#2f1e12]">
                      {currentPlanName}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#7a6553]">
                      {isPaidMember
                        ? tBilling("profileSection.paidDescription")
                        : tBilling("profileSection.basicDescription")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#fbf2e8] px-3 py-1 text-xs font-semibold text-[#8a5d32]">
                      {isPaidMember
                        ? t("trustSecure")
                        : tBilling("profileSection.upgradeReady")}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#fbf2e8] px-3 py-1 text-xs font-semibold text-[#8a5d32]">
                      {t("trustCancel")}
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      void handleHeroAction();
                    }}
                    disabled={isPaidMember && isManaging}
                    className="h-12 rounded-2xl bg-[#a16d38] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(160,109,56,0.24)] hover:bg-[#8f5f31] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isPaidMember && isManaging ? t("managingSubscription") : heroActionLabel}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-eatrivo-black-primary md:text-5xl">
                {t("title")}
              </h1>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-eatrivo-black-secondary/80">
                {t("subtitle")}
              </p>
            </div>
          )}
        </motion.div>

        <div
          ref={plansRef}
          className={
            embedded
              ? "space-y-3"
              : "mx-auto max-w-3xl"
          }
        >
          {availableUpgradeTiers.length > 0 ? (
            <div className={embedded ? "space-y-3" : "space-y-4"}>
              <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16d38]">
                  {tBilling("profileSection.availableUpgradesEyebrow")}
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[#2f1e12]">
                  {tBilling("profileSection.availableUpgradesTitle")}
                </h2>
              </div>

              <div
                className={
                  embedded
                    ? "space-y-4"
                    : "grid gap-8 md:grid-cols-2 items-start"
                }
              >
                {availableUpgradeTiers.map((tier) => (
                  <PricingCard
                    key={tier}
                    tier={tier}
                    price={tier === "premium" ? 3.99 : 0}
                    isPopular={tier === "premium"}
                    isCurrentPlan={false}
                    onSelect={() => handleUpgrade(tier)}
                    trialDays={trialDays}
                    ctaOverride={t("upgrade")}
                  />
                ))}
              </div>
            </div>
          ) : embedded ? (
            <div className="rounded-[1.5rem] border border-[#efe0cf] bg-white p-5 shadow-[0_16px_34px_rgba(160,109,56,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a16d38]">
                {tBilling("profileSection.noUpgradeEyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[#2f1e12]">
                {tBilling("profileSection.noUpgradeTitle")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#7a6553]">
                {tBilling("profileSection.noUpgradeDescription")}
              </p>
            </div>
          ) : null}
        </div>

        {status !== "authenticated" ? (
          <motion.div
            className={embedded ? "rounded-[1.5rem] border border-[#efe0cf] bg-white p-5 text-center shadow-[0_16px_34px_rgba(160,109,56,0.08)]" : "mt-14 text-center"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-sm text-eatrivo-black-secondary/60">
              {t("signInToUpgrade")}
            </p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}