/**
 * Landing Page Animation Hooks
 *
 * Custom hooks following React best practices for reusable animation logic.
 * Inspired by Ryan Florence's composition patterns and Addy Osmani's performance principles.
 */

import { useReducedMotion, type Variants } from "framer-motion";
import { useMemo } from "react";

export interface StaggerConfig {
  staggerChildren?: number;
  delayChildren?: number;
}

/**
 * Hook for fade-in-up animations with reduced motion support
 * Follows WCAG 2.1 Success Criterion 2.3.3
 */
export function useFadeInUp(delay: number = 0): Variants {
  const prefersReducedMotion = useReducedMotion();

  return useMemo((): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.01 } },
      };
    }

    return {
      hidden: { opacity: 0, y: 24 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.5,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        },
      },
    };
  }, [prefersReducedMotion, delay]);
}

/**
 * Hook for staggered container animations
 */
export function useStaggerContainer(config?: StaggerConfig): Variants {
  const prefersReducedMotion = useReducedMotion();
  const { staggerChildren = 0.1, delayChildren = 0 } = config ?? {};

  return useMemo((): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    }

    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren,
          delayChildren,
        },
      },
    };
  }, [prefersReducedMotion, staggerChildren, delayChildren]);
}

/**
 * Hook for scale-in animations (buttons, badges)
 */
export function useScaleIn(delay: number = 0): Variants {
  const prefersReducedMotion = useReducedMotion();

  return useMemo((): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    }

    return {
      hidden: { opacity: 0, scale: 0.95 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.4,
          delay,
          ease: [0.34, 1.56, 0.64, 1],
        },
      },
    };
  }, [prefersReducedMotion, delay]);
}

/**
 * Hook for floating animation (decorative elements)
 * Returns animation props for the animate prop
 */
export function useFloatAnimation() {
  const prefersReducedMotion = useReducedMotion();

  return useMemo(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    return {
      y: [0, -8, 0],
      transition: {
        repeat: Infinity,
        duration: 4,
        ease: "easeInOut" as const,
      },
    };
  }, [prefersReducedMotion]);
}
