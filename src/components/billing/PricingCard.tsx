"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Crown, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { trackInteraction } from "@/lib/analytics-client";

interface PricingCardProps {
  tier: "basic" | "premium" | "pro";
  price: number | "Free";
  features?: string[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  trialDays?: number;
}

export function PricingCard({
  tier,
  price,
  features,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  disabled = false,
  trialDays,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("pricing");

  const handleClick = async () => {
    if (disabled || isCurrentPlan || tier === "basic") return;

    trackInteraction({
      componentName: "PricingCard",
      action: "click",
      metadata: { targetTier: tier, price },
    });

    setLoading(true);
    try {
      await onSelect?.();
    } finally {
      setLoading(false);
    }
  };

  const tierConfig = {
    basic: {
      icon: Star,
      accent: "eatrivo-black-secondary",
      badgeBg: "bg-gray-100 text-gray-600",
      checkColor: "text-gray-400",
      buttonClass: "bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100",
      glowColor: "transparent",
    },
    premium: {
      icon: Crown,
      accent: "eatrivo-purple",
      badgeBg: "bg-eatrivo-purple/10 text-eatrivo-purple",
      checkColor: "text-eatrivo-purple",
      buttonClass:
        "bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90 shadow-lg shadow-eatrivo-purple/25",
      glowColor: "rgba(123, 63, 242, 0.15)",
    },
    pro: {
      icon: Zap,
      accent: "violet-600",
      badgeBg: "bg-violet-100 text-violet-600",
      checkColor: "text-violet-500",
      buttonClass:
        "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/25",
      glowColor: "rgba(124, 58, 237, 0.15)",
    },
  };

  const config = tierConfig[tier];
  const TierIcon = config.icon;
  const tierName = t(`tiers.${tier}.name`);
  const displayFeatures =
    features || (t.raw(`tiers.${tier}.features`) as string[]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      {/* Popular glow ring */}
      {isPopular && !isCurrentPlan && (
        <motion.div
          className="absolute -inset-[2px] rounded-3xl bg-gradient-to-br from-eatrivo-purple via-eatrivo-pink to-eatrivo-purple opacity-60 blur-sm"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div
        className={cn(
          "relative flex flex-col rounded-3xl border-2 bg-white p-7 transition-all duration-300",
          isPopular && !isCurrentPlan && "border-eatrivo-purple/40",
          isCurrentPlan && "border-eatrivo-green/60",
          !isPopular && !isCurrentPlan && "border-gray-200/80",
        )}
      >
        {/* Badges */}
        {isPopular && !isCurrentPlan && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center gap-1.5 rounded-full bg-eatrivo-purple px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-eatrivo-purple/30"
            >
              <Crown className="w-3.5 h-3.5" />
              {t("popular")}
            </motion.span>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3.5 right-5">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center gap-1.5 rounded-full bg-eatrivo-green px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-eatrivo-green/30"
            >
              <Check className="w-3.5 h-3.5" />
              {t("currentPlan")}
            </motion.span>
          </div>
        )}

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                config.badgeBg,
              )}
            >
              <TierIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-eatrivo-black-primary">
              {tierName}
            </h3>
          </div>
          <p className="text-sm text-eatrivo-black-secondary/80 leading-relaxed">
            {t(`tiers.${tier}.description`)}
          </p>
        </div>

        {/* Price */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          {price === "Free" ? (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-eatrivo-black-primary tracking-tight">
                {t("tiers.basic.name") === "Basic" ? "Free" : "Zadarmo"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-eatrivo-black-primary tracking-tight">
                  €{price}
                </span>
                <span className="text-sm text-eatrivo-black-secondary font-medium">
                  {t("perMonth")}
                </span>
              </div>
              {trialDays && !isCurrentPlan && (
                <div className="inline-flex items-center mt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-eatrivo-green/10 text-eatrivo-green text-xs font-bold border border-eatrivo-green/20">
                    {t("trialDays", {
                      days: trialDays,
                      defaultValue: `${trialDays} Dní Zadarmo`,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="mb-8 flex-1 space-y-3.5">
          {displayFeatures.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  tier === "basic"
                    ? "bg-gray-100"
                    : tier === "premium"
                      ? "bg-eatrivo-purple/10"
                      : "bg-violet-100",
                )}
              >
                <Check
                  className={cn("w-3 h-3 stroke-[3px]", config.checkColor)}
                />
              </div>
              <span className="text-sm text-eatrivo-black-secondary leading-relaxed">
                {feature}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          size="lg"
          className={cn(
            "w-full rounded-xl font-bold text-sm h-12 transition-all duration-200",
            config.buttonClass,
            loading && "opacity-80",
          )}
          onClick={handleClick}
          disabled={disabled || loading || isCurrentPlan || tier === "basic"}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCurrentPlan
            ? t("currentPlan")
            : tier === "basic"
              ? t("getStarted")
              : `${t("upgrade")} ${tierName}`}
        </Button>
      </div>
    </motion.div>
  );
}
