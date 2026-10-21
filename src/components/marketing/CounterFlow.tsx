"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/utils";

import { INGREDIENTS, IngredientThumb } from "./primitives";

/* -------------------------------------------------------------------------- */
/* Flow geometry (ported from .agent/landing/mobile_build.js, 350×330 units)   */
/* -------------------------------------------------------------------------- */

/** Ingredient circle diameter, in flow units (350-wide flow). */
const THUMB = 52;
/** Equal gap between the six circles: (350 − 6×52) / 5 = 7.6. */
const GAP = (350 - 6 * THUMB) / 5;
/** Pan centre, in flow units (pan: 210 wide at left 70, top 120). */
const PAN_CENTER = { x: 175, y: 225 };
const EASE = "cubic-bezier(0.22,1,0.36,1)";

/** Each thumb's start centre, as a percentage offset of its own (square) size. */
const THUMB_OFFSETS = INGREDIENTS.map((_, i) => {
  const startX = i * (THUMB + GAP) + THUMB / 2;
  const startY = THUMB / 2;
  return {
    dx: ((PAN_CENTER.x - startX) / THUMB) * 100,
    dy: ((PAN_CENTER.y - startY) / THUMB) * 100,
  };
});

/** Dashed curve for each thumb, down towards the pan. */
const FLOW_LINES = INGREDIENTS.map((_, i) => {
  const x0 = i * (THUMB + GAP) + THUMB / 2;
  const y0 = THUMB + 6;
  const x1 = 175 + (x0 - 175) * 0.25;
  const y1 = 128;
  return `M${x0} ${y0} C ${x0} ${y0 + 40}, ${x1} ${y1 - 40}, ${x1} ${y1}`;
});

type CounterFlowProps = {
  /** Ingredient label per `INGREDIENTS` key, in `marketing.counter.ingredients`. */
  labels: Record<string, string>;
  panAlt: string;
  children: React.ReactNode;
};

/**
 * Signature landing interaction: six pantry thumbs fly into the pan once the
 * flow is 40% visible, then settle back. Pure CSS transitions, no libraries.
 */
export default function CounterFlow({ labels, panAlt, children }: CounterFlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  // null until we know the user's motion preference (keeps SSR/no-JS safe).
  const [motionAllowed, setMotionAllowed] = useState<boolean | null>(null);
  const [cooked, setCooked] = useState(false);
  const [flying, setFlying] = useState(false);
  const [cardHidden, setCardHidden] = useState(false);

  useEffect(() => {
    setMotionAllowed(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCooked(true);
          setFlying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!cooked) return;
    const timer = window.setTimeout(() => setFlying(false), 900);
    return () => window.clearTimeout(timer);
  }, [cooked]);

  // Hide the recipe card only after mount, only when motion is allowed, and
  // only while the flow has not been seen yet — otherwise it stays visible.
  useEffect(() => {
    if (motionAllowed === true && !cooked) setCardHidden(true);
  }, [motionAllowed, cooked]);

  const animate = flying && motionAllowed === true;
  const showCard = !(cardHidden && !cooked);

  return (
    <div
      ref={rootRef}
      data-cooked={cooked ? "true" : undefined}
      className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-24"
    >
      {/* Flow: thumbs → pan */}
      <div className="relative aspect-[350/330] w-full max-w-[350px] shrink-0 lg:max-w-[560px]">
        <svg
          className="absolute left-0 top-0 h-auto w-full overflow-visible"
          viewBox="0 0 350 140"
          fill="none"
          aria-hidden="true"
        >
          {FLOW_LINES.map((d, i) => (
            <path
              key={INGREDIENTS[i].key}
              d={d}
              stroke="#B794FF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="4 6"
              style={{
                strokeDashoffset: animate ? -40 : 0,
                transition: animate ? "stroke-dashoffset 1.2s linear" : "none",
              }}
            />
          ))}
        </svg>

        <div className="absolute inset-x-0 top-0 flex justify-between">
          {INGREDIENTS.map((ingredient, i) => {
            const { dx, dy } = THUMB_OFFSETS[i];
            return (
              <div
                key={ingredient.key}
                className="relative aspect-square w-[14.8571%]"
                style={{
                  transform: animate
                    ? `translate(${dx}%, ${dy}%) scale(0.6)`
                    : "translate(0%, 0%) scale(1)",
                  opacity: animate ? 0 : 1,
                  transition: `transform 600ms ${EASE}, opacity 600ms ${EASE}`,
                  transitionDelay: animate ? `${i * 70}ms` : "0ms",
                }}
              >
                <IngredientThumb
                  cx={ingredient.cx}
                  cy={ingredient.cy}
                  ring
                  className="size-full"
                />
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold lg:text-[13px] leading-[1.2] text-mk-text-2">
                  {labels[ingredient.key]}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="absolute left-[20%] top-[36.3636%] aspect-square w-[60%] overflow-hidden rounded-full shadow-[0_18px_40px_rgba(41,26,77,0.22)]"
          style={{
            transform: animate ? "scale(1.04)" : "scale(1)",
            transition: `transform 500ms ${EASE}`,
          }}
        >
          <Image
            src="/images/landing/shakshuka.webp"
            alt={panAlt}
            fill
            sizes="(min-width:1024px) 336px, 210px"
            className="object-cover"
          />
        </div>
      </div>

      {/* Recipe card: fades and slides in once the flow has "cooked". */}
      <div
        className={cn(
          "flex flex-col gap-3.5 lg:flex-1",
          "motion-safe:transition-[transform,opacity] motion-safe:duration-500 motion-safe:ease-out",
          !showCard && "translate-y-4 opacity-0",
        )}
        style={{ transitionDelay: showCard ? "300ms" : "0ms" }}
      >
        {children}
      </div>
    </div>
  );
}
