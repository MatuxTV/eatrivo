"use client";

import { useCallback } from "react";

type HapticVariant = "light" | "medium" | "success";

const HAPTIC_PATTERNS: Record<HapticVariant, number | number[]> = {
  light: 12,
  medium: 20,
  success: [18, 24, 18],
};

export function useHapticFeedback() {
  return useCallback((variant: HapticVariant = "light") => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return;
    }

    navigator.vibrate(HAPTIC_PATTERNS[variant]);
  }, []);
}