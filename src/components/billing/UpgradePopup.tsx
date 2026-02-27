"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X, Crown, Check, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UpgradePopupProps {
  isOpen: boolean;
  onClose: () => void;
  trialDays?: number;
}

const COUNTDOWN_SECONDS = 0.5;

// ─── Circular countdown ring ────────────────────────────────────────────────
function CountdownRing({
  progress,
  countdown,
}: {
  progress: number;
  countdown: number;
}) {
  const r = 14;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg className="absolute -rotate-90" width="36" height="36">
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
        />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="rgba(251,191,36,0.75)"
          strokeWidth="2"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="text-xs font-semibold text-amber-300">{countdown}</span>
    </div>
  );
}

// ─── Animation variants ──────────────────────────────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 48 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 320,
      damping: 28,
      delay: 0.08,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 24,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const crownVariants = {
  hidden: { scale: 0, rotate: -20 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 16,
      delay: 0.32,
    },
  },
};

const featureVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.48 + i * 0.11,
      duration: 0.32,
      ease: "easeOut" as const,
    },
  }),
};

const FEATURES = ["feature1", "feature2", "feature3"] as const;

// ─── Main component ──────────────────────────────────────────────────────────
export function UpgradePopup({
  isOpen,
  onClose,
  trialDays,
}: UpgradePopupProps) {
  const [canClose, setCanClose] = useState(false);
  const [fetchedTrialDays, setFetchedTrialDays] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && trialDays === undefined && fetchedTrialDays === null) {
      fetch("/api/user/subscription")
        .then((res) => res.json())
        .then((data) => {
          if (data.trialDays !== undefined) {
            setFetchedTrialDays(data.trialDays);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, trialDays, fetchedTrialDays]);

  const displayTrialDays = trialDays ?? fetchedTrialDays ?? 14;
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [ringProgress, setRingProgress] = useState(1);

  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("upgrade");

  // Reset + run countdown every time popup opens
  useEffect(() => {
    if (!isOpen) {
      setCanClose(false);
      setCountdown(COUNTDOWN_SECONDS);
      setRingProgress(1);
      return;
    }

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 1;
      setCountdown(COUNTDOWN_SECONDS - elapsed);
      setRingProgress(1 - elapsed / COUNTDOWN_SECONDS);
      if (elapsed >= COUNTDOWN_SECONDS) {
        clearInterval(timer);
        setCanClose(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleUpgrade = () => {
    onClose();
    router.push(`/${locale}/pricing`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(123,63,242,0.22) 0%, rgba(0,0,0,0.75) 100%)",
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Click-outside to dismiss once unlocked */}
          {canClose && <div className="absolute inset-0" onClick={onClose} />}

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-sm"
          >
            {/* ── Close / Countdown pill ─────────────────────────── */}
            <div className="absolute -right-3 -top-3 z-10">
              <AnimatePresence mode="wait">
                {canClose ? (
                  <motion.button
                    key="close-btn"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                      transition: {
                        type: "spring",
                        stiffness: 420,
                        damping: 20,
                      },
                    }}
                    exit={{ scale: 0 }}
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/60 ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="countdown-ring"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CountdownRing
                      progress={ringProgress}
                      countdown={countdown}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Card body ──────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-eatrivo-black-primary p-6 shadow-2xl ring-1 ring-white/10">
              {/* Ambient glow blobs */}
              <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-amber-500/12 blur-3xl" />

              {/* ── Crown with pulsing aura ─────────────────────── */}
              <div className="mb-5 flex justify-center">
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.45, 1],
                      opacity: [0.45, 0.1, 0.45],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-amber-400/35 blur-lg"
                  />
                  <motion.div
                    variants={crownVariants}
                    initial="hidden"
                    animate="visible"
                    className="relative rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 shadow-xl shadow-amber-500/25"
                  >
                    <Crown className="h-8 w-8 text-white drop-shadow" />
                  </motion.div>
                </div>
              </div>

              {/* ── Headline ───────────────────────────────────────── */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.38 }}
                className="mb-1.5 text-center text-[1.35rem] font-bold leading-tight tracking-tight text-white"
              >
                {t("title", { defaultValue: "Odomkni naplno svoj potenciál!" })}
              </motion.h2>

              {/* ── Trial Days Badge ───────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.42, duration: 0.3 }}
                className="mb-2 flex justify-center"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-eatrivo-green/20 px-3 py-1 text-sm font-bold text-eatrivo-green ring-1 ring-eatrivo-green/30 shadow-lg shadow-eatrivo-green/20">
                  <Zap className="h-3.5 w-3.5" />
                  {t("trialDays", {
                    days: displayTrialDays,
                    defaultValue: `${displayTrialDays} Dní Zadarmo`,
                  })}
                </span>
              </motion.div>

              {/* ── Description ────────────────────────────────────── */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44, duration: 0.36 }}
                className="mb-5 text-center text-sm leading-relaxed text-white/45"
              >
                {t("description")}
              </motion.p>

              {/* ── Feature list (staggered) ────────────────────────── */}
              <ul className="mb-5 space-y-2">
                {FEATURES.map((key, i) => (
                  <motion.li
                    key={key}
                    custom={i}
                    variants={featureVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/75 ring-1 ring-white/[0.07]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                      <Check className="h-3 w-3 text-amber-400" />
                    </span>
                    {t(key)}
                  </motion.li>
                ))}
              </ul>

              {/* ── Social proof ───────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.88, duration: 0.4 }}
                className="mb-4 flex items-center justify-center gap-2"
              >
                <div className="flex -space-x-1.5">
                  {["🧑‍🍳", "👩‍⚕️", "🏃‍♂️"].map((emoji, i) => (
                    <div
                      key={i}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] ring-1 ring-white/20"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-white/35">
                  {t("socialProof")}
                </span>
              </motion.div>

              {/* ── CTA button with shimmer sweep ──────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.92, duration: 0.34 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleUpgrade}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 py-4 text-[0.95rem] font-bold text-white shadow-lg shadow-amber-500/25 transition-shadow hover:shadow-amber-500/45"
                >
                  {/* Shimmer sweep */}
                  <motion.span
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      repeatDelay: 1.8,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/25 blur-sm"
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4" />
                    {t("upgradeButton")}
                  </span>
                </motion.button>
              </motion.div>

              {/* ── Maybe later (appears after countdown) ──────────── */}
              <AnimatePresence>
                {canClose && (
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    onClick={onClose}
                    className="mt-3 w-full text-center text-xs text-white/25 transition hover:text-white/45"
                  >
                    {t("maybeLater")}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
