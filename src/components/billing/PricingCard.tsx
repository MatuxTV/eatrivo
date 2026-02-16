"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PricingCardProps {
  tier: "basic" | "premium" | "pro";
  price: number | "Free";
  features?: string[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export function PricingCard({
  tier,
  price,
  features,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  disabled = false,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("pricing");

  const handleClick = async () => {
    if (disabled || isCurrentPlan || tier === "basic") return;
    setLoading(true);
    try {
      await onSelect?.();
    } finally {
      setLoading(false);
    }
  };

  const tierConfig = {
    basic: {
      gradient: "from-slate-500 to-slate-600",
      buttonVariant: "default" as const,
    },
    premium: {
      gradient: "from-emerald-500 to-teal-600",
      buttonVariant: "default" as const,
    },
    pro: {
      gradient: "from-violet-500 to-purple-600",
      buttonVariant: "default" as const,
    },
  };

  const config = tierConfig[tier];
  const tierName = t(`tiers.${tier}.name`);

  // Use provided features or fall back to translations
  const displayFeatures =
    features || (t.raw(`tiers.${tier}.features`) as string[]);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-eatrivo-white-secondary p-6 shadow-lg transition-all text-eatrivo-black-primary duration-300 hover:shadow-xl",
        isPopular && "border-primary ring-2 ring-primary/20 scale-105",
        isCurrentPlan && "border-emerald-500/50 bg-emerald-500/5",
      )}
    >
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {t("popular")}
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
            {t("currentPlan")}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3
          className={cn(
            "bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent",
            config.gradient,
          )}
        >
          {tierName}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`tiers.${tier}.description`)}
        </p>
      </div>

      <div className="mb-6">
        {price === "Free" ? (
          <span className="text-4xl font-bold">
            {t("tiers.basic.name") === "Basic" ? "Free" : "Zadarmo"}
          </span>
        ) : (
          <>
            <span className="text-4xl font-bold">€{price}</span>
            <span className="text-muted-foreground">{t("perMonth")}</span>
          </>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {displayFeatures.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={config.buttonVariant}
        size="lg"
        className="w-full"
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
  );
}
