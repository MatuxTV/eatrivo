"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Sparkles,
  ShoppingBasket,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useFadeInUp,
  useStaggerContainer,
  useScaleIn,
} from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

const stepMeta = [
  { key: "registration", number: 1 as const, icon: ClipboardList },
  { key: "plan", number: 2 as const, icon: Sparkles },
  { key: "done", number: 3 as const, icon: ShoppingBasket },
] as const;

interface StepCardProps {
  number: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof ClipboardList;
  index: number;
  isLast: boolean;
}

function StepCard({
  number,
  title,
  subtitle,
  description,
  icon: Icon,
  index,
  isLast,
}: StepCardProps) {
  const fadeInUp = useFadeInUp();
  const scaleIn = useScaleIn(index * 0.15);

  return (
    <motion.article
      variants={fadeInUp}
      className="relative"
      aria-labelledby={`step-title-${number}`}
    >
      {/* Connector arrow between cards */}
      {!isLast && (
        <div
          className="hidden md:flex absolute top-1/2 -right-6 lg:-right-8 -translate-y-1/2 z-10 text-eatrivo-purple/30"
          aria-hidden="true"
        >
          <ArrowRight className="w-5 h-5" />
        </div>
      )}

      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg hover:border-eatrivo-purple/15 transition-[box-shadow,border-color] duration-300 h-full"
      >
        <div className="flex items-center gap-4 mb-5">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="w-14 h-14 bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink rounded-2xl flex items-center justify-center text-white shadow-lg shadow-eatrivo-purple/20 flex-shrink-0"
            aria-hidden="true"
          >
            <span className="text-xl font-bold">{number}</span>
          </motion.div>
          <div className="w-10 h-10 bg-eatrivo-purple/5 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-eatrivo-purple" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3
            id={`step-title-${number}`}
            className="text-xl font-semibold text-eatrivo-black-primary"
          >
            {title}
          </h3>
          <span className="text-xs bg-eatrivo-purple/10 text-eatrivo-purple px-2.5 py-1 rounded-full font-medium">
            {subtitle}
          </span>
        </div>

        <p className="text-eatrivo-gray leading-relaxed">{description}</p>
      </motion.div>
    </motion.article>
  );
}

export function HowItWorksSection({ className = "" }: SectionProps) {
  const t = useTranslations("landing.howItWorks");
  const staggerContainer = useStaggerContainer({ staggerChildren: 0.15 });
  const titleFadeIn = useFadeInUp();

  return (
    <section
      id="how-it-works"
      className={`py-20 md:py-28 bg-eatrivo-light ${className}`}
      aria-labelledby="how-it-works-title"
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
            id="how-it-works-title"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-eatrivo-black-primary mb-4"
          >
            {t("title")}
          </h2>
          <p className="text-lg text-eatrivo-gray max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.header>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-8 md:gap-12"
          role="list"
          aria-label="Steps"
        >
          {stepMeta.map((step, index) => (
            <StepCard
              key={step.key}
              number={step.number}
              icon={step.icon}
              title={t(`steps.${step.key}.title`)}
              subtitle={t(`steps.${step.key}.subtitle`)}
              description={t(`steps.${step.key}.description`)}
              index={index}
              isLast={index === stepMeta.length - 1}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
