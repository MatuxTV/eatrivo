"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Crown, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface MembershipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hero: ReactNode;
}

type BillingOption = "monthly" | "yearly";

function formatEuroAmount(amount: number) {
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

export default function MembershipUpgradeModal({
  isOpen,
  onClose,
  hero,
}: MembershipUpgradeModalProps) {
  const t = useTranslations("upgrade");
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotion();
  const [billingOption, setBillingOption] = useState<BillingOption>("yearly");
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const billingPlans: Array<{
    id: BillingOption;
    label: string;
    totalPrice: number;
    suffix: string;
    billingMonths: number;
    isPopular?: boolean;
  }> = [
    {
      id: "monthly",
      label: t("monthlyLabel"),
      totalPrice: 3.99,
      suffix: t("perMonthShort"),
      billingMonths: 1,
    },
    {
      id: "yearly",
      label: t("yearlyLabel"),
      totalPrice: 29.99,
      suffix: t("perYearShort"),
      billingMonths: 12,
      isPopular: true,
    },
  ];
  const selectedPlan =
    billingPlans.find((plan) => plan.id === billingOption) ?? billingPlans[1];
  const monthlyPlan =
    billingPlans.find((plan) => plan.id === "monthly") ?? billingPlans[0];

  async function handleUpgrade() {
    setCheckoutError(null);
    setIsRedirectingToCheckout(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "premium",
          billingCycle: billingOption,
          locale,
          sourcePage: "membership-upgrade-modal",
          surface: `membership_upgrade_modal_${billingOption}`,
        }),
      });

      const data = (await response.json()) as { error?: string; url?: string };

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setCheckoutError(data.error || "Checkout failed");
      setIsRedirectingToCheckout(false);
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutError("Checkout failed");
      setIsRedirectingToCheckout(false);
    }
  }

  const selectedPriceLabel =
    selectedPlan.billingMonths === 12
      ? `${formatEuroAmount(
          Math.floor((selectedPlan.totalPrice / selectedPlan.billingMonths) * 100) /
            100,
        )}${t("perMonthShort")}`
      : `${formatEuroAmount(selectedPlan.totalPrice)}${t("perMonthShort")}`;

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.96, y: 24 }
            }
            animate={
              shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.98, y: 20 }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : { type: "spring", stiffness: 340, damping: 28 }
            }
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          >
            <div className="relative flex max-h-[min(92dvh,940px)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-[#fcfcf7] text-slate-950 shadow-[0_24px_80px_rgba(15,23,32,0.28)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.96))]" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full bg-slate-700 p-2 text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfcf7]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                {hero}

                <div className="mt-5 space-y-4">
                  <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-eatrivo-purple bg-eatrivo-purple/5 p-4 shadow-[0_12px_32px_rgba(16,185,129,0.14)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900">
                          <div className="rounded-full bg-eatrivo-purple/12 p-2 text-eatrivo-purple">
                            <Crown className="h-4 w-4" />
                          </div>
                          <p className="text-xl font-black tracking-tight">
                            {t("title")}
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {t("trialDays", { days: 14 })}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 ">
                          {t("socialProof")}
                        </p>
                      </div>

                      <div className="w-full sm:max-w-[14.5rem]">
                        <div className="relative rounded-[1.2rem] bg-white/90 p-1 shadow-sm ring-1 ring-black/5">
                          <div
                            className={
                              billingOption === "monthly"
                                ? "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[0.95rem] bg-eatrivo-purple shadow-[0_10px_24px_rgba(16,185,129,0.24)] transition-all duration-300"
                                : "absolute inset-y-1 left-[calc(50%+0.25rem)] w-[calc(50%-0.5rem)] rounded-[0.95rem] bg-eatrivo-purple shadow-[0_10px_24px_rgba(16,185,129,0.24)] transition-all duration-300"
                            }
                          />

                          <div className="relative grid grid-cols-2 gap-1">
                            {billingPlans.map((plan) => {
                              const isSelected = billingOption === plan.id;

                              return (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() => setBillingOption(plan.id)}
                                  className={
                                    isSelected
                                      ? "rounded-[0.95rem] px-3 py-2 text-sm font-semibold text-white transition"
                                      : "rounded-[0.95rem] px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                                  }
                                >
                                  <span className="flex flex-col items-center gap-1 leading-tight">
                                    <span>{plan.label}</span>
                                    {plan.isPopular ? (
                                      <span
                                        className={
                                          isSelected
                                            ? "rounded-full bg-white/18 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.12em] text-white"
                                            : "rounded-full bg-eatrivo-purple/12 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.12em] text-eatrivo-purple"
                                        }
                                      >
                                        {t("mostPopular")}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-3 rounded-[1.15rem] bg-white/90 px-4 py-3 shadow-sm ring-1 ring-black/5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedPlan.label}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                {selectedPlan.id === "yearly" ? (
                                  <div>
                                    <span className="text-slate-400 line-through mr-1">
                                      {formatEuroAmount(
                                        monthlyPlan.totalPrice * selectedPlan.billingMonths,
                                      )}
                                      {t("perYearShort")}
                                    </span>
                                    <span className=" text-eatrivo-black-primary">
                                      {formatEuroAmount(selectedPlan.totalPrice)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black tracking-tight text-eatrivo-black-primary">
                                {selectedPriceLabel}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>{t("cancelAnytime")}</span>
                  </div>

                  {checkoutError ? (
                    <p className="text-center text-sm font-medium text-red-600">
                      {checkoutError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="relative shrink-0 border-t border-slate-200/80 bg-[#fcfcf7]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:px-6 sm:pb-6">
                <Button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isRedirectingToCheckout}
                  className="h-14 w-full rounded-[1.15rem] bg-eatrivo-purple text-base font-semibold text-white border-2 border-eatrivo-white-primary/20 hover:bg-eatrivo-purple/90"
                >
                  {isRedirectingToCheckout ? "Redirecting..." : t("upgradeButton")}
                  {!isRedirectingToCheckout ? (
                    <ArrowRight className="ml-2 h-4 w-4" />
                  ) : null}
                </Button>

                <button
                  type="button"
                  onClick={onClose}
                  className="mx-auto mt-3 block text-sm font-medium text-slate-500 transition hover:text-slate-700"
                >
                  {t("maybeLater")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
