"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Crown, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface MembershipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hero: ReactNode;
}

const FEATURE_KEYS = ["feature1", "feature2", "feature3"] as const;

export default function MembershipUpgradeModal({
  isOpen,
  onClose,
  hero,
}: MembershipUpgradeModalProps) {
  const t = useTranslations("upgrade");
  const locale = useLocale();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  function handleUpgrade() {
    onClose();
    router.push(`/${locale}/pricing`);
  }

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
              shouldReduceMotion
                ? undefined
                : { opacity: 1, scale: 1, y: 0 }
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

              <div className="relative overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6 sm:pt-6">
                {hero}

                <div className="mt-5 space-y-4">
                  <div className="relative overflow-hidden rounded-[1.45rem] border-2 border-emerald-500 bg-[linear-gradient(180deg,#effcf5,#ddf4eb)] p-4 shadow-[0_12px_32px_rgba(16,185,129,0.14)]">
                    <span className="absolute right-4 top-0 -translate-y-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                      {t("mostPopular")}
                    </span>

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900">
                          <div className="rounded-full bg-emerald-500/12 p-2 text-emerald-700">
                            <Crown className="h-4 w-4" />
                          </div>
                          <p className="text-xl font-black tracking-tight">
                            {t("title")}
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {t("trialDays", { days: 14 })}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 line-through decoration-emerald-600/70 decoration-2">
                          {t("socialProof")}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm ring-1 ring-black/5">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Plus
                        </p>
                        <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
                          AI
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2.5">
                    {FEATURE_KEYS.map((featureKey) => (
                      <div
                        key={featureKey}
                        className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)]"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm font-medium leading-6 text-slate-700">
                          {t(featureKey)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>{t("cancelAnytime")}</span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleUpgrade}
                    className="h-14 w-full rounded-[1.15rem] bg-slate-900 text-base font-semibold text-white shadow-[0_8px_0_rgba(15,23,42,0.18)] hover:bg-slate-800"
                  >
                    {t("upgradeButton")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mx-auto block text-sm font-medium text-slate-500 transition hover:text-slate-700"
                  >
                    {t("maybeLater")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}