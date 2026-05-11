"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { Button } from "@/components/ui/button";

interface ProfileBillingSectionProps {
  embedded?: boolean;
}

type BillingOption = "monthly" | "yearly";

function formatEuroAmount(amount: number) {
  return `EUR ${amount.toFixed(2).replace(".", ",")}`;
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
  const tUpgrade = useTranslations("upgrade");
  const billingHomePath = "/home?section=profile&profileView=billing";

  const [currentMembership, setCurrentMembership] = useState<string>("basic");
  const [trialDays, setTrialDays] = useState<number | undefined>(undefined);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [billingOption, setBillingOption] = useState<BillingOption>("yearly");
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
  const currentPlanFeatures = useMemo(() => {
    return (t.raw(`tiers.${resolvedMembership}.features`) as string[] | undefined) ?? [];
  }, [resolvedMembership, t]);
  const plusFeatures = useMemo(() => {
    return (t.raw("tiers.premium.features") as string[] | undefined) ?? [];
  }, [t]);
  const billingPlans = [
    {
      id: "monthly" as const,
      shortLabel: tUpgrade("monthlyLabel"),
      totalPrice: 3.99,
      billingMonths: 1,
    },
    {
      id: "yearly" as const,
      shortLabel: tUpgrade("yearlyLabel"),
      totalPrice: 29.99,
      billingMonths: 12,
      isPopular: true,
    },
  ];
  const selectedBillingPlan =
    billingPlans.find((plan) => plan.id === billingOption) ?? billingPlans[1];
  const yearlyReferencePrice = formatEuroAmount(billingPlans[0].totalPrice * 12);
  const selectedPriceLabel =
    selectedBillingPlan.billingMonths === 12
      ? `${formatEuroAmount(
          Math.floor(
            (selectedBillingPlan.totalPrice / selectedBillingPlan.billingMonths) * 100,
          ) / 100,
        )}${t("perMonth")}`
      : `${formatEuroAmount(selectedBillingPlan.totalPrice)}${t("perMonth")}`;

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
      router.push(`/${locale}?callbackUrl=${encodeURIComponent(billingHomePath)}`);
      return;
    }

    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const handleUpgrade = async (tier: "premium") => {
    if (status !== "authenticated") {
      router.push(`/${locale}?callbackUrl=${encodeURIComponent(billingHomePath)}`);
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingCycle: billingOption,
          locale,
          sourcePage: embedded ? "profile-billing" : "pricing",
          surface: embedded
            ? `profile_billing_${billingOption}`
            : `pricing_page_${billingOption}`,
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
      setIsCheckingOut(false);
    } catch (error) {
      console.error("Checkout error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
      setIsCheckingOut(false);
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
              ? "rounded-[2rem] border border-eatrivo-purple/12 bg-gradient-to-br from-white via-eatrivo-white-primary to-eatrivo-purple/5 p-5 shadow-[0_20px_50px_rgba(123,63,242,0.12)] sm:p-6"
              : "mb-14 rounded-[2.25rem] border border-eatrivo-purple/12 bg-gradient-to-br from-white via-eatrivo-white-primary to-eatrivo-purple/5 p-8 text-left shadow-[0_20px_50px_rgba(123,63,242,0.1)]"
          }
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {embedded ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-purple">
                    {tBilling("profileSection.membershipEyebrow")}
                  </p>
                  <h1 className="text-[1.9rem] font-black tracking-[-0.05em] text-eatrivo-black-primary sm:text-[2.15rem]">
                    {t("title")}
                  </h1>
                  <p className="max-w-2xl text-sm font-medium leading-6 text-eatrivo-black-secondary">
                    {tBilling("profileSection.description")}
                  </p>
                </div>

                <div className="hidden rounded-[1.4rem] border border-eatrivo-purple/12 bg-white px-4 py-3 text-right sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-purple">
                    {tBilling("profileSection.currentPlanLabel")}
                  </p>
                  <p className="mt-1 text-base font-black tracking-[-0.04em] text-eatrivo-black-primary">
                    {currentPlanName}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-eatrivo-purple/12 bg-white p-5 shadow-[0_18px_38px_rgba(123,63,242,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-eatrivo-purple/10 text-eatrivo-purple">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-purple">
                      {tBilling("profileSection.yourMembershipLabel")}
                    </p>
                    <p className="mt-1 truncate text-xl font-black tracking-[-0.05em] text-eatrivo-black-primary">
                      {currentPlanName}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-eatrivo-black-secondary">
                      {isPaidMember
                        ? tBilling("profileSection.paidDescription")
                        : tBilling("profileSection.basicDescription")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {currentPlanFeatures.slice(0, 4).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 rounded-[1rem] bg-eatrivo-white-primary px-3 py-3"
                    >
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-eatrivo-green/12 text-eatrivo-green">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-medium leading-6 text-eatrivo-black-primary">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-eatrivo-purple/8 px-3 py-1 text-xs font-semibold text-eatrivo-purple">
                      {isPaidMember
                        ? t("trustSecure")
                        : tBilling("profileSection.upgradeReady")}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-eatrivo-green/10 px-3 py-1 text-xs font-semibold text-eatrivo-green">
                      {t("trustCancel")}
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      void handleHeroAction();
                    }}
                    disabled={isPaidMember && isManaging}
                    className="h-12 rounded-2xl bg-eatrivo-purple px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(123,63,242,0.24)] hover:bg-eatrivo-purple/90 disabled:cursor-not-allowed disabled:opacity-60"
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
          {!isPaidMember ? (
            <div className={embedded ? "space-y-3" : "space-y-4"}>
              <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-purple">
                  {tBilling("profileSection.availableUpgradesEyebrow")}
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-eatrivo-black-primary">
                  EATRIVO Plus
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-eatrivo-black-secondary">
                  {t("tiers.premium.description")}
                </p>
              </div>

              <div className="rounded-[2rem] border border-eatrivo-purple/12 bg-white p-5 shadow-[0_20px_50px_rgba(123,63,242,0.08)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-eatrivo-purple/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-eatrivo-purple">
                      <Sparkles className="h-3.5 w-3.5" />
                      EATRIVO Plus
                    </div>
                    <h3 className="mt-4 text-[1.75rem] font-black tracking-[-0.05em] text-eatrivo-black-primary">
                      {selectedPriceLabel}
                    </h3>
                    {billingOption === "yearly" ? (
                      <p className="mt-2 text-sm font-medium text-eatrivo-black-secondary">
                        <span className="mr-2 text-slate-400 line-through">
                          {yearlyReferencePrice}{tUpgrade("perYearShort")}
                        </span>
                        <span className="font-semibold text-eatrivo-black-primary">
                          {formatEuroAmount(selectedBillingPlan.totalPrice)}{tUpgrade("perYearShort")}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-eatrivo-black-secondary">
                        {formatEuroAmount(selectedBillingPlan.totalPrice)}{t("perMonth")}
                      </p>
                    )}
                  </div>

                  {selectedBillingPlan.isPopular ? (
                    <span className="rounded-full bg-eatrivo-green/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-eatrivo-green">
                      {tUpgrade("mostPopular")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 rounded-[1.3rem] bg-eatrivo-white-primary p-1">
                  <div className="grid grid-cols-2 gap-1">
                    {billingPlans.map((plan) => {
                      const isSelected = billingOption === plan.id;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setBillingOption(plan.id)}
                          className={`rounded-[1rem] px-4 py-3 text-left transition ${
                            isSelected
                              ? "bg-eatrivo-purple text-white shadow-[0_14px_30px_rgba(123,63,242,0.18)]"
                              : "bg-transparent text-eatrivo-black-primary hover:bg-white"
                          }`}
                        >
                          <p className="text-sm font-bold">{plan.shortLabel}</p>
                          <p
                            className={`mt-1 text-xs font-medium ${
                              isSelected ? "text-white/80" : "text-eatrivo-black-secondary"
                            }`}
                          >
                            {plan.id === "yearly"
                              ? `${formatEuroAmount(plan.totalPrice)}${tUpgrade("perYearShort")}`
                              : `${formatEuroAmount(plan.totalPrice)}${t("perMonth")}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {plusFeatures.slice(0, 4).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 rounded-[1rem] bg-eatrivo-white-primary px-3 py-3"
                    >
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-eatrivo-purple/10 text-eatrivo-purple">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-medium leading-6 text-eatrivo-black-primary">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-eatrivo-purple/8 px-3 py-1 text-xs font-semibold text-eatrivo-purple">
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    {t("trustSecure")}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-eatrivo-green/10 px-3 py-1 text-xs font-semibold text-eatrivo-green">
                    {trialDays
                      ? t("trialDays", { days: trialDays })
                      : tUpgrade("cancelAnytime")}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    void handleUpgrade("premium");
                  }}
                  disabled={isCheckingOut}
                  className="mt-5 h-12 w-full rounded-2xl bg-eatrivo-purple text-sm font-bold text-white shadow-[0_14px_30px_rgba(123,63,242,0.24)] hover:bg-eatrivo-purple/90 disabled:opacity-60"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isCheckingOut ? t("managingSubscription") : t("upgrade")}
                </Button>
              </div>
            </div>
          ) : embedded ? (
            <div className="rounded-[1.5rem] border border-eatrivo-purple/12 bg-white p-5 shadow-[0_16px_34px_rgba(123,63,242,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-purple">
                {tBilling("profileSection.noUpgradeEyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-eatrivo-black-primary">
                {tBilling("profileSection.noUpgradeTitle")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-eatrivo-black-secondary">
                {tBilling("profileSection.noUpgradeDescription")}
              </p>
            </div>
          ) : null}
        </div>

        {status !== "authenticated" ? (
          <motion.div
            className={embedded ? "rounded-[1.5rem] border border-eatrivo-purple/12 bg-white p-5 text-center shadow-[0_16px_34px_rgba(123,63,242,0.08)]" : "mt-14 text-center"}
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