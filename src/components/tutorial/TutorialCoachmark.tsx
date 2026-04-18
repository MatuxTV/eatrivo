"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TutorialCoachmarkStep, TutorialPlacement } from "@/lib/tutorials/types";

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findVisibleAnchor(target: string): HTMLElement | null {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tutorial-anchor="${target}"]`),
  );

  return (
    elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }) ?? null
  );
}

function getDesktopCardPosition(
  rect: RectState,
  placement: TutorialPlacement,
  cardWidth: number,
  cardHeight: number,
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const gap = 18;

  let top = rect.top;
  let left = rect.left;

  switch (placement) {
    case "top":
      top = rect.top - cardHeight - gap;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      break;
    case "bottom":
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.left - cardWidth - gap;
      break;
    case "right":
    default:
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.left + rect.width + gap;
      break;
  }

  return {
    top: Math.min(Math.max(16, top), viewportHeight - cardHeight - 16),
    left: Math.min(Math.max(16, left), viewportWidth - cardWidth - 16),
  };
}

interface TutorialCoachmarkProps {
  step: TutorialCoachmarkStep;
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  onTargetMissing: () => void;
}

export function TutorialCoachmark({
  step,
  stepIndex,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onClose,
  onTargetMissing,
}: TutorialCoachmarkProps) {
  const t = useTranslations("tutorial");
  const [rect, setRect] = useState<RectState | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let missingTimer: number | undefined;

    const measure = () => {
      setIsMobile(window.innerWidth < 768);

      const anchor = findVisibleAnchor(step.target);
      if (!anchor) {
        setRect(null);
        missingTimer = window.setTimeout(() => {
          onTargetMissing();
        }, 120);
        return;
      }

      anchor.scrollIntoView({
        block: "center",
        behavior: "smooth",
        inline: "nearest",
      });

      window.requestAnimationFrame(() => {
        const nextRect = anchor.getBoundingClientRect();
        setRect({
          top: nextRect.top,
          left: nextRect.left,
          width: nextRect.width,
          height: nextRect.height,
        });
      });
    };

    measure();

    const handleWindowChange = () => measure();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      if (missingTimer) {
        window.clearTimeout(missingTimer);
      }
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [onTargetMissing, step.target]);

  const cardStyle = useMemo(() => {
    if (!rect || isMobile) {
      return undefined;
    }

    return getDesktopCardPosition(rect, step.placement ?? "bottom", 320, 212);
  }, [isMobile, rect, step.placement]);

  if (typeof document === "undefined" || !rect) {
    return null;
  }

  const title = step.title ?? (step.titleKey ? t(step.titleKey) : "");
  const description =
    step.description ?? (step.descriptionKey ? t(step.descriptionKey) : "");

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("common.actions.close")}
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
      />

      <div
        className="pointer-events-none absolute rounded-[1.5rem] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-200"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />

      <div
        className={cn(
          "absolute z-[91] w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.75rem] border border-white/80 bg-white/96 p-4 text-left shadow-[0_24px_70px_rgba(34,20,55,0.22)] backdrop-blur-xl",
          isMobile ? "bottom-3 left-1/2 -translate-x-1/2" : "",
        )}
        style={
          isMobile
            ? undefined
            : {
                top: cardStyle?.top,
                left: cardStyle?.left,
              }
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-eatrivo-purple">
            {t("common.labels.quickTip")}
          </div>
          <div className="text-[11px] font-semibold text-eatrivo-black-secondary/70">
            {t("common.progress", { current: stepIndex + 1, total: totalSteps })}
          </div>
        </div>

        <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.03em] text-[#2d1647]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#665d76]">{description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-gray-200 bg-white px-4 text-gray-700"
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
          <Button
            type="button"
            className="ml-auto rounded-full bg-eatrivo-purple px-5 text-white hover:bg-eatrivo-purple/90"
            onClick={onNext}
          >
            {stepIndex === totalSteps - 1
              ? t("common.actions.finish")
              : t("common.actions.next")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}