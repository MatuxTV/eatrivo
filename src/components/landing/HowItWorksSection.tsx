"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ClipboardList, Sparkles, ShoppingBasket, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFadeInUp, useStaggerContainer } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

const stepMeta = [
  { key: "registration", number: 1 as const, icon: ClipboardList },
  { key: "plan", number: 2 as const, icon: Sparkles },
  { key: "done", number: 3 as const, icon: ShoppingBasket },
] as const;

// Fix: moved imageMap outside the render function to avoid recreating the
// object on every iteration of the map callback.
const imageMap: Record<number, string> = {
  1: "/images/how-it-works/Gemini_Generated_Image_1zhk2u1zhk2u1zhk.svg",
  2: "/images/how-it-works/RIVO5-remove.svg",
  3: "/images/how-it-works/Gemini_Generated_Image_8zwp3q8zwp3q8zwp.svg",
};

interface StepCardProps {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  badge: string;
  icon: typeof ClipboardList;
  index: number;
  isLast: boolean;
  imageSrc?: string;
}

function FlowArrow({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.5 + index * 0.2, duration: 0.6 }}
      className="hidden lg:block absolute top-1/3 -right-12 xl:-right-16 w-28 xl:w-32 z-0"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M 5 50 Q 30 20, 60 45 Q 75 55, 95 50"
          stroke="url(#arrowGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.6 + index * 0.2,
            duration: 1,
            ease: "easeInOut",
          }}
        />
        <motion.path
          d="M 95 50 L 85 45 M 95 50 L 85 55"
          stroke="url(#arrowGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.4 + index * 0.2, duration: 0.3 }}
        />
        <defs>
          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        animate={{
          x: [0, 20, 40, 60, 80],
          y: [0, -10, -5, -8, 0],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.5,
        }}
        className="absolute top-1/2 left-0 w-2 h-2 bg-eatrivo-purple/50 rounded-full"
      />
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
  badge,
  index,
  isLast,
  imageSrc,
}: StepCardProps) {
  const fadeInUp = useFadeInUp();

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      className="relative flex flex-col items-center cursor-default"
      aria-labelledby={`step-title-${number}`}
    >
      {!isLast && <FlowArrow index={index} />}

      {/* Illustration
          Fix: verified max sizes are safe on mobile.
          w-44 = 176px which fits within a 320px viewport (with 4px padding each
          side from the px-4 container). No overflow issue. */}
      {imageSrc && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.2 + index * 0.15,
            type: "spring",
            stiffness: 200,
          }}
          className="relative w-44 h-44 sm:w-48 sm:h-48 lg:w-52 lg:h-52 xl:w-56 xl:h-56 mb-4 sm:mb-6"
        >
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 176px, (max-width: 1024px) 192px, (max-width: 1280px) 208px, 224px"
          />
        </motion.div>
      )}

      {/* Content */}
      <div className="flex items-start gap-3 sm:gap-4 w-full max-w-sm px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + index * 0.15 }}
          className="flex-shrink-0"
        >
          <span className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink bg-clip-text text-transparent leading-none">
            {number}
          </span>
        </motion.div>

        <div className="flex-1 pt-1 sm:pt-2">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 + index * 0.15 }}
            className="inline-flex items-center gap-1 bg-eatrivo-purple/8 border border-eatrivo-purple/15 text-eatrivo-purple rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold mb-2 tracking-wide uppercase"
          >
            <Clock className="w-2.5 h-2.5" aria-hidden="true" />
            {badge}
          </motion.div>

          <h3
            id={`step-title-${number}`}
            className="text-lg sm:text-xl lg:text-2xl font-bold text-eatrivo-black-primary mb-1.5 sm:mb-2 leading-tight"
          >
            {title}
          </h3>

          <p className="text-eatrivo-gray leading-relaxed text-xs sm:text-sm">
            {description}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export function HowItWorksSection({ className = "" }: SectionProps) {
  const t = useTranslations("landing.howItWorks");
  const staggerContainer = useStaggerContainer({ staggerChildren: 0.2 });
  const titleFadeIn = useFadeInUp();

  return (
    <section
      id="how-it-works"
      className={`py-12 sm:py-16 md:py-20 lg:py-28 bg-gradient-to-b from-gray-50 to-white ${className}`}
      aria-labelledby="how-it-works-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="text-center mb-12 sm:mb-16 lg:mb-20"
        >
          <h2
            id="how-it-works-title"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-eatrivo-black-primary mb-3 sm:mb-4 lg:mb-5 px-4"
          >
            {t("title")}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-eatrivo-gray max-w-3xl mx-auto px-4 mb-4 sm:mb-6">
            {t("subtitle")}
          </p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-eatrivo-green/10 border border-eatrivo-green/20 text-eatrivo-green rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {t("totalTime")}
          </motion.div>
        </motion.header>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-12 sm:gap-16 lg:grid-cols-3 lg:gap-8 xl:gap-16 max-w-6xl mx-auto"
          role="list"
          aria-label="Steps"
        >
          {stepMeta.map((step, index) => (
            <StepCard
              key={step.key}
              number={step.number}
              icon={step.icon}
              title={t(`steps.${step.key}.title`)}
              description={t(`steps.${step.key}.description`)}
              badge={t(`steps.${step.key}.badge`)}
              index={index}
              isLast={index === stepMeta.length - 1}
              imageSrc={imageMap[step.number]}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
