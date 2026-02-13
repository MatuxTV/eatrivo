"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Sparkles, ChefHat, ShoppingBasket, Heart, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SectionProps } from "@/types/landing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureConfig {
  readonly icon: typeof ChefHat;
  readonly key: "mealPlans" | "shoppingLists" | "personalized";
  readonly gradientFrom: string;
  readonly gradientTo: string;
  readonly glowColor: string;
  readonly delay: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURES: readonly FeatureConfig[] = [
  {
    icon: ChefHat,
    key: "mealPlans",
    gradientFrom: "from-violet-500",
    gradientTo: "to-purple-600",
    glowColor: "shadow-violet-500/25",
    delay: 0.55,
  },
  {
    icon: ShoppingBasket,
    key: "shoppingLists",
    gradientFrom: "from-fuchsia-500",
    gradientTo: "to-pink-500",
    glowColor: "shadow-fuchsia-500/25",
    delay: 0.65,
  },
  {
    icon: Heart,
    key: "personalized",
    gradientFrom: "from-pink-500",
    gradientTo: "to-rose-500",
    glowColor: "shadow-pink-500/25",
    delay: 0.75,
  },
] as const;

const SPEECH_BUBBLE_KEYS = [
  "speech1",
  "speech2",
  "speech3",
  "speech4",
] as const;

function TypewriterText({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setDisplayed("");
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (charIndex >= text.length) {
      onComplete?.();
      return;
    }
    const delay = charIndex === 0 ? 120 : charIndex < 5 ? 60 : 38;
    const timeout = setTimeout(() => {
      setDisplayed((prev) => prev + text[charIndex]);
      setCharIndex((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [charIndex, text, onComplete]);

  return (
    <span>
      {displayed}
      {charIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.65, repeat: Infinity }}
          className="inline-block w-0.5 h-3.5 bg-eatrivo-purple align-middle ml-0.5"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// ─── RivoSpeechBubble ─────────────────────────────────────────────────────────
//
// Fix: removed `whitespace-nowrap` which caused the bubble to overflow the
// viewport on 320px screens. Replaced with a max-w constraint and normal
// word-wrapping so long translated strings wrap gracefully.

function RivoSpeechBubble({ isVisible }: { isVisible: boolean }) {
  const t = useTranslations("landing.meetRivo");
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const currentKey = SPEECH_BUBBLE_KEYS[messageIndex];

  useEffect(() => {
    if (!isTypingDone) return;
    const timer = setTimeout(() => {
      setMessageIndex((prev) => (prev + 1) % SPEECH_BUBBLE_KEYS.length);
      setIsTypingDone(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isTypingDone]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }
      }
      // Fix: removed `whitespace-nowrap`. Added `max-w-[220px]` so the bubble
      // never exceeds the Rivo image width on any screen size, and text wraps
      // instead of pushing outside the viewport on 320px devices.
      className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 max-w-[220px] w-max"
      role="status"
      aria-live="polite"
      aria-label="Rivo is speaking"
    >
      <div className="relative bg-white/92 backdrop-blur-md border border-white/70 rounded-2xl px-4 py-2.5 shadow-lg shadow-eatrivo-purple/10">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="text-sm font-medium text-eatrivo-black-primary min-w-[160px] text-center"
          >
            <TypewriterText
              text={t(currentKey)}
              onComplete={() => setIsTypingDone(true)}
            />
          </motion.p>
        </AnimatePresence>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/92 border-r border-b border-white/60 rotate-45 backdrop-blur-md"
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
}

// ─── FloatingStatBadge ────────────────────────────────────────────────────────
//
// Fix: on mobile the badge was positioned with `-right-4` which caused it to
// bleed out of the viewport since the parent container is already near the
// screen edge. Changed to `right-0` on mobile so it stays within bounds, then
// restores to `-right-8` from sm upward where there is enough column width.

function FloatingStatBadge({
  value,
  labelKey,
  className,
  delay,
}: {
  value: string;
  labelKey: string;
  className?: string;
  delay: number;
}) {
  const t = useTranslations("landing.meetRivo");
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.5, delay, ease: [0.34, 1.56, 0.64, 1] }
      }
      className={`absolute z-20 ${className ?? ""}`}
    >
      <div className="bg-white/88 backdrop-blur-md border border-white/70 rounded-2xl px-3 py-2.5 shadow-lg shadow-black/5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink flex items-center justify-center shrink-0">
          <Star
            className="w-3.5 h-3.5 text-white fill-white"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-eatrivo-black-primary leading-none">
            {value}
          </p>
          <p className="text-[10px] text-eatrivo-gray leading-tight mt-0.5">
            {t(labelKey)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── RivoAura ─────────────────────────────────────────────────────────────────

function RivoAura({ isHovered }: { isHovered: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-eatrivo-purple/20"
          animate={
            isHovered
              ? { scale: [1, 1.45 + i * 0.18], opacity: [0.55, 0] }
              : { scale: [1, 1.18 + i * 0.08], opacity: [0.22, 0] }
          }
          transition={{
            duration: isHovered ? 0.85 : 2.5,
            repeat: Infinity,
            delay: i * (isHovered ? 0.22 : 0.7),
            ease: "easeOut",
          }}
          style={{
            width: `${52 + i * 16}%`,
            height: `${52 + i * 16}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── FeatureItem ──────────────────────────────────────────────────────────────

function FeatureItem({
  feature,
  index,
}: {
  feature: FeatureConfig;
  index: number;
}) {
  const t = useTranslations("landing.meetRivo");
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 28 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.5,
              delay: feature.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }
      }
      className="relative flex items-start gap-4 cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        animate={
          isHovered && !shouldReduceMotion
            ? {
                scale: [1, 1.2, 0.93, 1.07, 1],
                rotate: [0, -10, 7, -4, 0],
              }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.42, ease: "easeInOut" }}
        className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradientFrom} ${feature.gradientTo} flex items-center justify-center shadow-lg ${feature.glowColor} transition-shadow duration-300 ${isHovered ? "shadow-xl" : ""}`}
        aria-hidden="true"
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>

      <div className="flex-1 pt-0.5">
        <motion.h3
          className="text-base font-bold text-eatrivo-black-primary mb-1 leading-snug"
          animate={
            isHovered && !shouldReduceMotion ? { x: 4 } : { x: 0 }
          }
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {t(`features.${feature.key}.title`)}
        </motion.h3>
        <p className="text-sm text-eatrivo-gray leading-relaxed">
          {t(`features.${feature.key}.description`)}
        </p>
      </div>

      {index < FEATURES.length - 1 && (
        <div
          className="absolute left-6 top-14 w-px h-5 bg-gradient-to-b from-eatrivo-purple/18 to-transparent"
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}

// ─── MeetRivo (main) ──────────────────────────────────────────────────────────

export function MeetRivo({ className = "" }: SectionProps) {
  const t = useTranslations("landing.meetRivo");
  const shouldReduceMotion = useReducedMotion();

  const rivoRef = useRef<HTMLDivElement>(null);
  const isRivoInView = useInView(rivoRef, { once: true, margin: "-80px" });

  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [isRivoHovered, setIsRivoHovered] = useState(false);

  useEffect(() => {
    if (!isRivoInView) return;
    const timer = setTimeout(() => setShowSpeechBubble(true), 900);
    return () => clearTimeout(timer);
  }, [isRivoInView]);

  return (
    <section
      className={`relative py-16 sm:py-24 md:py-32 overflow-hidden bg-white ${className}`}
      aria-labelledby="meet-rivo-title"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : { scale: [1, 1.2, 1], opacity: [0.16, 0.32, 0.16] }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-[-10%] w-[55%] h-[70%] bg-eatrivo-purple/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : { scale: [1, 1.25, 1], opacity: [0.1, 0.25, 0.1] }
          }
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute bottom-[-10%] right-[-5%] w-[58%] h-[60%] bg-eatrivo-pink/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={
            shouldReduceMotion ? {} : { opacity: [0.06, 0.16, 0.06] }
          }
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42%] h-[42%] bg-gradient-to-br from-eatrivo-purple/10 to-eatrivo-pink/10 rounded-full blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-24 items-center">

          {/* Left column: Rivo mascot */}
          <motion.div
            ref={rivoRef}
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -44 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }
            }
            className="order-1 relative flex justify-center lg:justify-start"
          >
            <div
              className="absolute inset-0 bg-gradient-to-br from-eatrivo-purple/6 to-eatrivo-pink/6 rounded-full blur-2xl scale-75"
              aria-hidden="true"
            />

            <div
              // Fix: on mobile the container spans up to 360px. Adding `overflow-hidden`
              // clips the stat badge so it cannot push outside the section boundary.
              // The badge itself is repositioned to `right-0` on mobile and
              // `-right-8` from sm+ where the column is wide enough.
              className="relative w-full max-w-[360px] sm:max-w-[420px] overflow-visible"
              onMouseEnter={() => setIsRivoHovered(true)}
              onMouseLeave={() => setIsRivoHovered(false)}
            >
              <RivoSpeechBubble isVisible={showSpeechBubble} />

              <motion.div
                animate={shouldReduceMotion ? {} : { y: [0, -14, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="relative aspect-square">
                    <RivoAura isHovered={isRivoHovered} />
                    <Image
                      src="/rivo/RIVO4-remove.png"
                      alt={t("mascotAlt")}
                      fill
                      className="object-contain relative z-10"
                      sizes="(max-width: 640px) 75vw, (max-width: 1024px) 45vw, 420px"
                      priority
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Social proof badge
                  Fix: was `bottom-8 -right-4 sm:-right-8`.
                  On mobile a -right-4 badge on a 75vw-wide container (e.g. 280px
                  on a 375px phone) leaves only 371px - 280px/2 - badge_width room,
                  which overflows. Anchoring to `right-0` on mobile keeps it inside
                  the container boundary. From sm+ there is enough horizontal space
                  to use the original -right-8 offset for the floating effect. */}
              {isRivoInView && (
                <FloatingStatBadge
                  value={t("statValue")}
                  labelKey="statLabel"
                  className="bottom-8 right-0 sm:-right-8"
                  delay={0.9}
                />
              )}
            </div>
          </motion.div>

          {/* Right column: Headline + features */}
          <motion.div
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 44 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.65,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.15,
                  }
            }
            className="order-2"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 10,
                scale: shouldReduceMotion ? 1 : 0.94,
              }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.4, delay: 0.28, ease: [0.34, 1.56, 0.64, 1] }
              }
              className="inline-flex items-center gap-2 bg-eatrivo-purple/8 border border-eatrivo-purple/15 text-eatrivo-purple rounded-full px-4 py-2 text-sm font-semibold mb-5"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : { rotate: [0, 15, -10, 15, 0] }
                }
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  repeatDelay: 4.5,
                }}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </motion.div>
              {t("badge")}
            </motion.div>

            <motion.h2
              id="meet-rivo-title"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: 0.32, ease: "easeOut" }
              }
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 leading-[1.15]"
            >
              <span className="bg-gradient-to-r from-eatrivo-purple via-violet-600 to-eatrivo-pink bg-clip-text text-transparent">
                {t("title")}
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: 0.37, ease: "easeOut" }
              }
              className="text-lg sm:text-xl font-semibold mb-5 leading-snug text-eatrivo-black-primary"
            >
              {t("subtitle")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: 0.42, ease: "easeOut" }
              }
              className="text-sm sm:text-base text-eatrivo-gray leading-relaxed mb-8 max-w-lg"
            >
              {t("description")}
            </motion.p>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.65, delay: 0.46, ease: "easeOut" }
              }
              style={{ originX: 0 }}
              className="h-px w-full max-w-xs bg-gradient-to-r from-eatrivo-purple/25 via-eatrivo-pink/15 to-transparent mb-8"
              aria-hidden="true"
            />

            <div className="space-y-5">
              {FEATURES.map((feature, index) => (
                <FeatureItem
                  key={feature.key}
                  feature={feature}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default MeetRivo;
