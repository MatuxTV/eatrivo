"use client";

import { motion } from "framer-motion";
import { ChefHat, ShoppingCart, Cpu, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFadeInUp } from "@/hooks/useAnimations";
import type { SectionProps, AppShowcaseFeature } from "@/types/landing";
import { colorClassMap } from "@/types/landing";

const features: readonly AppShowcaseFeature[] = [
  { id: "mealPlans", icon: ChefHat, color: "purple" },
  { id: "shoppingLists", icon: ShoppingCart, color: "pink" },
  { id: "aiExpert", icon: Cpu, color: "blue" },
] as const;

interface FeatureBlockProps {
  feature: AppShowcaseFeature;
  index: number;
  t: ReturnType<typeof useTranslations>;
}

function PhoneMockup({ feature }: { feature: AppShowcaseFeature }) {
  const colors = colorClassMap[feature.color];

  return (
    <div className="relative max-w-[240px] mx-auto">
      {/* Phone bezel */}
      <div className="relative bg-gray-900 rounded-[3rem] p-2.5 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-900 rounded-b-xl z-10" />

        {/* Screen - add your screenshots here */}
        <div className="relative bg-white rounded-[2.25rem] overflow-hidden">
          <div className="aspect-[9/19.5] relative bg-gradient-to-b from-gray-50 to-gray-100">
            {/* TODO: Replace with actual app screenshots */}
            {/* Examples:
              - mealPlans: <Image src="/screenshots/meal-plans.png" alt="Meal Plans" fill className="object-cover" />
              - shoppingLists: <Image src="/screenshots/shopping-lists.png" alt="Shopping Lists" fill className="object-cover" />
              - aiExpert: <Image src="/screenshots/ai-expert.png" alt="AI Expert" fill className="object-cover" />
            */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                  <feature.icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <p className="text-gray-400 text-xs">
                  Screenshot placeholder
                  <br />
                  <span className="text-[10px]">{feature.id}.png</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colored background glow */}
      <div
        className={`absolute -z-10 inset-0 ${colors.bg} rounded-3xl transform rotate-2 scale-[1.03] opacity-40`}
        aria-hidden="true"
      />
    </div>
  );
}

function FeatureBlock({ feature, index, t }: FeatureBlockProps) {
  const fadeInUp = useFadeInUp();
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
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeInUp}
      className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReversed ? "lg:direction-rtl" : ""}`}
    >
      <div className={`space-y-6 ${isReversed ? "lg:order-2 lg:direction-ltr" : ""}`}>
        <div
          className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center`}
          aria-hidden="true"
        >
          <Icon className={`w-7 h-7 ${colors.text}`} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-eatrivo-black-primary">
          {t(`${feature.id}.title`)}
        </h3>
        <p className="text-lg text-eatrivo-gray leading-relaxed">
          {t(`${feature.id}.description`)}
        </p>
        <ul className="space-y-3" aria-label={t(`${feature.id}.title`)}>
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-eatrivo-green/10 flex items-center justify-center mt-0.5">
                <Check className="w-3.5 h-3.5 text-eatrivo-green" aria-hidden="true" />
              </div>
              <span className="text-eatrivo-gray">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={isReversed ? "lg:order-1 lg:direction-ltr" : ""}>
        <PhoneMockup feature={feature} />
      </div>
    </motion.div>
  );
}

export function AppShowcase({ className = "" }: SectionProps) {
  const t = useTranslations("landing.appShowcase");
  const titleFadeIn = useFadeInUp();

  return (
    <section
      id="features"
      className={`py-20 md:py-28 bg-white ${className}`}
      aria-labelledby="app-showcase-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="text-center mb-20"
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
        </motion.header>

        <div className="space-y-20 md:space-y-28">
          {features.map((feature, index) => (
            <FeatureBlock
              key={feature.id}
              feature={feature}
              index={index}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default AppShowcase;
