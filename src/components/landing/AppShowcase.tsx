"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChefHat, ShoppingCart, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import type { SectionProps, AppShowcaseFeature } from "@/types/landing";
import { colorClassMap } from "@/types/landing";

const features: readonly AppShowcaseFeature[] = [
  { id: "mealPlans", icon: ChefHat, color: "purple" },
  { id: "shoppingLists", icon: ShoppingCart, color: "pink" },
] as const;

interface FeatureBlockProps {
  feature: AppShowcaseFeature;
  index: number;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

function PhoneMockup({ feature, locale }: { feature: AppShowcaseFeature; locale: string }) {
  const colors = colorClassMap[feature.color];

  const imagePath = feature.id === "mealPlans" 
    ? `/images/screenshots/${locale}/dashboard.PNG`
    : `/images/screenshots/${locale}/shopping-list.PNG`;

  const imageAlt = feature.id === "mealPlans" 
    ? "Meal Plans Dashboard"
    : "Shopping Lists";

  return (
    <div className="relative w-full max-w-[240px] mx-auto">
      {/* Colored background glow */}
      <div
        className={`absolute -inset-3 ${colors.bg} rounded-[3rem] blur-2xl opacity-30`}
        aria-hidden="true"
      />
      
      {/* Phone bezel */}
      <div className="relative bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-2xl z-20" />

        {/* Screen container */}
        <div className="relative bg-white rounded-[2rem] overflow-hidden">
          {/* Image with fixed aspect ratio */}
          <div className="relative w-full h-0 pb-[216.67%]">
            <Image
              src={imagePath}
              alt={imageAlt}
              fill
              className="absolute inset-0 object-cover object-top"
              sizes="240px"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({ feature, index, locale, t }: FeatureBlockProps) {
  const colors = colorClassMap[feature.color];
  const isReversed = index % 2 !== 0;
  const Icon = feature.icon;

  const bullets = [
    t(`${feature.id}.bullet1`),
    t(`${feature.id}.bullet2`),
    t(`${feature.id}.bullet3`),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${isReversed ? "lg:[&>*:last-child]:order-first" : ""}`}
    >
      {/* Text content */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`inline-flex w-16 h-16 rounded-2xl ${colors.bg} items-center justify-center shadow-lg`}
          aria-hidden="true"
        >
          <Icon className={`w-8 h-8 ${colors.text}`} />
        </motion.div>

        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-eatrivo-black-primary">
          {t(`${feature.id}.title`)}
        </h3>

        <p className="text-base sm:text-lg text-eatrivo-gray leading-relaxed">
          {t(`${feature.id}.description`)}
        </p>

        <ul className="space-y-4 pt-2" aria-label={t(`${feature.id}.title`)}>
          {bullets.map((bullet, idx) => (
            <motion.li
              key={bullet}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-eatrivo-green/10 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-eatrivo-green" aria-hidden="true" />
              </div>
              <span className="text-eatrivo-gray leading-relaxed">{bullet}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Phone mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex justify-center"
      >
        <PhoneMockup feature={feature} locale={locale} />
      </motion.div>
    </motion.div>
  );
}

export function AppShowcase({ className = "" }: SectionProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("landing.appShowcase");

  return (
    <section
      id="features"
      className={`relative py-20 md:py-28 bg-gradient-to-b from-white via-gray-50/50 to-white overflow-hidden ${className}`}
      aria-labelledby="app-showcase-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <h2
            id="app-showcase-title"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-eatrivo-black-primary mb-4"
          >
            {t("title")}
          </h2>
          <p className="text-lg text-eatrivo-gray max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Features */}
        <div className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <FeatureBlock
              key={feature.id}
              feature={feature}
              index={index}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default AppShowcase;
