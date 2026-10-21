import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils/utils";

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10", className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition motion-safe:hover:brightness-110 motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple";

const buttonSizes = {
  md: "px-6 py-[17px] text-[17px] leading-[1.2]",
  sm: "px-5 py-3 text-[15px] leading-[1.2]",
} as const;

export type ButtonSize = keyof typeof buttonSizes;

export function PrimaryButtonLink({
  href,
  children,
  showArrow = true,
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  showArrow?: boolean;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonBase,
        buttonSizes[size],
        "bg-gradient-to-r from-mk-purple to-mk-purple-2 text-white shadow-[0_12px_28px_rgba(123,63,242,0.28)]",
        className,
      )}
    >
      <span>{children}</span>
      {showArrow ? <ArrowRight size={20} aria-hidden="true" /> : null}
    </Link>
  );
}

export function OnDarkButtonLink({
  href,
  children,
  showArrow = true,
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  showArrow?: boolean;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonBase,
        buttonSizes[size],
        "bg-white text-mk-purple-deep shadow-[0_12px_28px_rgba(26,8,64,0.25)]",
        className,
      )}
    >
      <span>{children}</span>
      {showArrow ? <ArrowRight size={20} aria-hidden="true" /> : null}
    </Link>
  );
}

export function SecondaryButtonLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-mk-border bg-mk-surface px-6 py-4 text-[17px] font-bold leading-[1.2] text-mk-text shadow-[0_8px_20px_rgba(18,23,38,0.05)] transition motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Small display pieces                                                        */
/* -------------------------------------------------------------------------- */

export function IngredientTag({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-mk-surface py-1.5 pl-2.5 pr-3 shadow-[0_6px_16px_rgba(18,23,38,0.16)]",
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-mk-green" aria-hidden="true" />
      <span className="whitespace-nowrap text-[13px] font-bold leading-[1.2] text-mk-text">
        {label}
      </span>
    </div>
  );
}

export function Chip({
  children,
  selected = false,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-[9px] text-[14px] font-semibold leading-[1.2]",
        selected
          ? "border-[1.5px] border-mk-purple bg-mk-purple-soft text-mk-purple"
          : "border-[1.5px] border-mk-border-purple bg-mk-surface text-mk-text",
        className,
      )}
    >
      {selected ? <Check size={14} aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  );
}

export function PlusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-mk-purple-soft px-2 py-[3px] text-[11px] font-bold leading-[1.2] tracking-[0.08em] text-mk-purple",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CheckRow({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full",
          dark ? "bg-white/16 text-white" : "bg-mk-mint text-mk-green-deep",
        )}
        aria-hidden="true"
      >
        <Check size={13} strokeWidth={3} />
      </span>
      <span
        className={cn(
          "text-[15px] font-semibold leading-[1.35]",
          dark ? "text-white" : "text-mk-text",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ingredient thumbnails                                                       */
/* -------------------------------------------------------------------------- */

export const INGREDIENTS = [
  { key: "eggs", cx: 0.18, cy: 0.2 },
  { key: "tomatoes", cx: 0.47, cy: 0.22 },
  { key: "pepper", cx: 0.8, cy: 0.19 },
  { key: "onion", cx: 0.72, cy: 0.37 },
  { key: "feta", cx: 0.14, cy: 0.47 },
  { key: "spinach", cx: 0.36, cy: 0.58 },
] as const;

export function IngredientThumb({
  cx,
  cy,
  size,
  ring = false,
  className,
}: {
  cx: number;
  cy: number;
  /** Fixed pixel size. Omit to control the size with `className` (e.g. `size-full`). */
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const x = Math.min(Math.max(((cx - 0.1) / 0.8) * 100, 0), 100);
  const y = Math.min(Math.max(((cy - 0.08) / 0.84) * 100, 0), 100);

  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-cover bg-no-repeat",
        ring && "border-[3px] border-white shadow-[0_6px_16px_rgba(18,23,38,0.16)]",
        className,
      )}
      style={{
        ...(size != null ? { width: size, height: size } : null),
        backgroundImage: "url(/images/landing/hero-counter.webp)",
        backgroundSize: "500% 625%",
        backgroundPosition: `${x}% ${y}%`,
      }}
      aria-hidden="true"
    />
  );
}
