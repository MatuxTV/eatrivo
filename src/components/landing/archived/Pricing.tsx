"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles, ShieldCheck, Coffee, Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { useFadeInUp, useStaggerContainer } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";
import { Button } from "@/components/ui/button";
import { trackClientEvent } from "@/lib/analytics-client";

interface PricingTier {
  tier: "basic" | "premium";
  price: string | number;
  isPopular?: boolean;
}

const pricingTiers: readonly PricingTier[] = [
  { tier: "basic", price: 0 },
  { tier: "premium", price: 3.99, isPopular: true },
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
      buttonVariant: "default" as const,
    },
    premium: {
      gradient: "from-emerald-500 to-teal-600",
      buttonVariant: "default" as const,
    },
  };

  const config = tierConfig[tier.tier];

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative flex flex-col rounded-2xl border bg-white p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 ${
        isPopular
          ? // Fix: `scale-105` causes the card to overflow the grid container on
            // single-column mobile layouts. On mobile we use `mt-4` to give extra
            // breathing room around the "Popular" badge instead of scaling the
            // card. The scale is only restored from `md:` where both cards sit
            // side-by-side and there is space for the overflow.
            "border-eatrivo-purple ring-2 ring-eatrivo-purple/20 mt-4 md:scale-105"
          : "border-gray-200"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
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

      <div className="mb-2">
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
        {isPopular && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1.5 mt-2 mb-2"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span className="text-xs text-amber-600 font-medium">
              {t("valueAnchor")}
            </span>
          </motion.div>
        )}

        {isPopular && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, rotate: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.4,
            }}
            className="mt-3 relative inline-flex group cursor-default"
          >
            {/* Animated glow aura */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 blur-sm"
            />
            {/* Badge body */}
            <div className="relative flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-emerald-500/20">
              <span className="flex items-center justify-center rounded-full bg-emerald-50 p-1">
                <Gift
                  className="h-3.5 w-3.5 text-emerald-600"
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-extrabold uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                {t("trialDays", { days: 14, defaultValue: "14 Dní Zadarmo" })}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <ul className="mb-8 mt-6 flex-1 space-y-3">
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

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant={config.buttonVariant}
          size="lg"
          className={`w-full transition-all duration-200 ${
            isPopular
              ? "bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90 shadow-md shadow-eatrivo-purple/20"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
          asChild
        >
          <Link
            href={
              tier.tier === "basic" ? `/${locale}/signin` : `/${locale}/pricing`
            }
            onClick={() => {
              if (tier.tier === "premium") {
                trackClientEvent({
                  eventName: "pricing_plan_selected",
                  metadata: {
                    tier: tier.tier,
                    billing_period: "monthly",
                    source_page: "landing",
                    surface: "landing_pricing",
                    locale,
                  },
                });
                return;
              }

              trackClientEvent({
                eventName: "landing_cta_clicked",
                metadata: {
                  cta_id: `pricing_${tier.tier}_cta`,
                  cta_label: "get_started",
                  destination: "signin",
                  section: "pricing",
                  locale,
                },
              });
            }}
          >
            {tier.tier === "basic" ? t("getStarted") : t("upgrade")}
          </Link>
        </Button>
      </motion.div>

      {isPopular && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-1.5 mt-3"
        >
          <ShieldCheck
            className="w-3.5 h-3.5 text-eatrivo-green"
            aria-hidden="true"
          />
          <span className="text-xs text-eatrivo-gray">{t("guarantee")}</span>
        </motion.div>
      )}
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
          // Fix: single-column on mobile to avoid cramped side-by-side cards on
          // small phones. Two columns from md+ where there is enough space.
          // Added `items-start` so the taller popular card (with mt-4 top offset)
          // does not force the basic card to stretch vertically.
          className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-start"
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
          <p className="text-sm text-eatrivo-gray">{t("signInToUpgrade")}</p>
        </motion.div>
      </div>
    </section>
  );
}

export default Pricing;
