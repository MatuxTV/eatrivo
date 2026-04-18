"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TutorialModalDefinition, TutorialModalStep } from "@/lib/tutorials/types";

function resolveStepText(
  step: TutorialModalStep,
  key: "title" | "description" | "eyebrow" | "ctaLabel",
  t: ReturnType<typeof useTranslations>,
) {
  const rawValue = step[key];
  if (typeof rawValue === "string") {
    return rawValue;
  }

  const keyName = `${key}Key` as const;
  const translationKey = step[keyName];
  return translationKey ? t(translationKey) : "";
}

interface TutorialModalProps {
  open: boolean;
  definition: TutorialModalDefinition;
  stepIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TutorialModal({
  open,
  definition,
  stepIndex,
  onBack,
  onNext,
  onSkip,
  onClose,
}: TutorialModalProps) {
  const t = useTranslations("tutorial");
  const step = definition.steps[stepIndex];
  const totalSteps = definition.steps.length;
  const isLastStep = stepIndex === totalSteps - 1;

  if (!step) {
    return null;
  }

  const eyebrow = resolveStepText(step, "eyebrow", t);
  const title = resolveStepText(step, "title", t);
  const description = resolveStepText(step, "description", t);
  const primaryLabel =
    resolveStepText(step, "ctaLabel", t) ||
    (isLastStep ? t("common.actions.finish") : t("common.actions.next"));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent
        className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[2rem] border-none bg-white p-0 shadow-[0_40px_120px_rgba(56,36,86,0.28)] sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#fff9fd_0%,#f5ecff_54%,#f3ecff_100%)] p-5 sm:p-7">
          <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-[#ead7ff] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-[#ffdce9] blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-eatrivo-purple shadow-sm">
                {eyebrow || t("common.labels.guidedTour")}
              </div>
              <div className="text-xs font-semibold text-eatrivo-black-secondary/70">
                {t("common.progress", {
                  current: stepIndex + 1,
                  total: totalSteps,
                })}
              </div>
            </div>

            <DialogHeader className="text-left">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <DialogTitle className="max-w-[18rem] text-2xl font-black leading-tight tracking-[-0.04em] text-[#2d1647] sm:max-w-none sm:text-[2rem]">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="mt-3 max-w-[26rem] text-sm leading-6 text-[#695f79] sm:text-[15px]">
                    {description}
                  </DialogDescription>

                  {step.featureList?.length ? (
                    <div className="mt-5 space-y-2.5">
                      {step.featureList.map((feature) => (
                        <div
                          key={feature}
                          className="rounded-2xl border border-white/80 bg-white/78 px-4 py-3 text-sm font-medium text-[#433557] shadow-sm"
                        >
                          {feature}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </DialogHeader>

            <div className="mt-6 flex items-center gap-2">
              {definition.steps.map((definitionStep, index) => (
                <span
                  key={definitionStep.id}
                  className={`h-2 rounded-full transition-all duration-300 ${index === stepIndex ? "w-8 bg-eatrivo-purple" : "w-2 bg-eatrivo-purple/20"}`}
                />
              ))}
            </div>

            <DialogFooter className="mt-7 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="rounded-full border-gray-200 bg-white/90 px-4 text-gray-700"
                  onClick={onSkip}
                >
                  {t("common.actions.skip")}
                </Button>
                {stepIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4 text-eatrivo-purple hover:bg-eatrivo-purple/8 hover:text-eatrivo-purple"
                    onClick={onBack}
                  >
                    {t("common.actions.back")}
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={onNext}
                className="h-11 rounded-full bg-eatrivo-purple px-6 text-white hover:bg-eatrivo-purple/90"
              >
                {primaryLabel}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}