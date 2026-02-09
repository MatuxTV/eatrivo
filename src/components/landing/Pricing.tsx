"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { useFadeInUp, useStaggerContainer } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";
import { Button } from "@/components/ui/button";

interface PricingTier {
  tier: "basic" | "premium"; // | "pro";
  price: string | number;
  isPopular?: boolean;
}

const pricingTiers: readonly PricingTier[] = [
  { tier: "basic", price: "Free" },
  { tier: "premium", price: 5, isPopular: true },
] as const;

interface PricingCardProps {
  tier: PricingTier;
  name: string;
  description: string;
  features: string[];
  price: string | number;
  isPopular?: boolean;
  locale: string;
}

function PricingCard({
  tier,
  name,
  description,
  features,
  price,
  isPopular = false,
  locale,
}: PricingCardProps) {
  const fadeInUp = useFadeInUp();
  const t = useTranslations("pricing");

  const tierConfig = {
    basic: {
      gradient: "from-slate-500 to-slate-600",
      buttonVariant: "outline" as const,
    },
    premium: {
      gradient: "from-emerald-500 to-teal-600",
      buttonVariant: "default" as const,
    }
    // pro: {
    //   gradient: "from-violet-500 to-purple-600",
    //   buttonVariant: "default" as const,
    // },
  };

  const config = tierConfig[tier.tier];

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative flex flex-col rounded-2xl border bg-white p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 ${
        isPopular
          ? "border-eatrivo-purple ring-2 ring-eatrivo-purple/20 scale-105"
          : "border-gray-200"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink px-4 py-1 text-xs font-semibold text-white">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            {t("popular")}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3
          className={`bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent ${config.gradient}`}
        >
          {name}
        </h3>
        <p className="mt-2 text-sm text-eatrivo-gray">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          {typeof price === "number" ? (
            <>
              <span className="text-4xl font-bold text-eatrivo-black-primary">
                €{price}
              </span>
              <span className="text-eatrivo-gray">{t("perMonth")}</span>
            </>
          ) : (
            <span className="text-4xl font-bold text-eatrivo-black-primary">
              {price}
            </span>
          )}
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-eatrivo-green"
              aria-hidden="true"
            />
            <span className="text-sm text-eatrivo-black-secondary">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant={config.buttonVariant}
        size="lg"
        className={`w-full ${
          isPopular
            ? "bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90"
            : "bg-white border-gray-300"
        }`}
        asChild
      >
        <Link href={tier.tier === "basic" ? `/${locale}/signin` : `/${locale}/pricing`}>
          {tier.tier === "basic" ? t("getStarted") : t("upgrade")}
        </Link>
      </Button>
    </motion.article>
  );
}

export function Pricing({ className = "" }: SectionProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("pricing");
  const staggerContainer = useStaggerContainer({ staggerChildren: 0.15 });
  const titleFadeIn = useFadeInUp();

  return (
    <section
      id="pricing"
      className={`py-20 md:py-28 bg-eatrivo-light ${className}`}
      aria-labelledby="pricing-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="text-center mb-16"
        >
          <h2
            id="pricing-title"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-eatrivo-black-primary mb-4"
          >
            {t("title")}
          </h2>
          <p className="text-lg text-eatrivo-gray max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.header>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto"
        >
          {pricingTiers.map((tier) => {
            const name = t(`tiers.${tier.tier}.name`);
            const description = t(`tiers.${tier.tier}.description`);
            const features = t.raw(`tiers.${tier.tier}.features`) as string[];

            return (
              <PricingCard
                key={tier.tier}
                tier={tier}
                name={name}
                description={description}
                features={features}
                locale={locale}
                price={tier.price}
                isPopular={tier.isPopular}
              />
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="mt-12 text-center space-y-3"
        >
          <p className="text-sm text-eatrivo-gray">
            {t("signInToUpgrade")}
          </p>
          <p className="text-xs text-eatrivo-gray italic max-w-2xl mx-auto">
            💡 AI does the calculations. Experts guarantee the quality.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
