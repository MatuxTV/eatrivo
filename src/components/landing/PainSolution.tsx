"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFadeInUp } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

const painPointKeys = ["cooking", "calories", "expensive", "shopping"] as const;

function PainCard({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 bg-eatrivo-red/5 border border-eatrivo-red/10 rounded-xl p-4 group-hover:bg-eatrivo-red/3 transition-colors">
      <div
        className="flex-shrink-0 w-10 h-10 bg-eatrivo-red/10 rounded-full flex items-center justify-center"
        aria-hidden="true"
      >
        <X className="w-5 h-5 text-eatrivo-red" />
      </div>
      <p className="text-eatrivo-black-primary font-medium text-sm sm:text-base">{text}</p>
    </div>
  );
}

function SolutionCard({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 bg-eatrivo-green/5 border border-eatrivo-green/10 rounded-xl p-4 group-hover:bg-eatrivo-green/8 transition-colors">
      <div
        className="flex-shrink-0 w-10 h-10 bg-eatrivo-green/10 rounded-full flex items-center justify-center"
        aria-hidden="true"
      >
        <Check className="w-5 h-5 text-eatrivo-green" />
      </div>
      <p className="text-eatrivo-black-primary font-medium text-sm sm:text-base">{text}</p>
    </div>
  );
}

function ComparisonRow({
  problem,
  solution,
  index,
}: {
  problem: string;
  solution: string;
  index: number;
}) {
  const fadeInUp = useFadeInUp(index * 0.08);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="grid md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-center group cursor-default"
      role="listitem"
    >
      <PainCard text={problem} />
      <div className="hidden md:flex items-center justify-center" aria-hidden="true">
        <ArrowRight className="w-5 h-5 text-eatrivo-purple/40 group-hover:text-eatrivo-purple transition-colors" />
      </div>
      <SolutionCard text={solution} />
    </motion.div>
  );
}

export function PainSolution({ className = "" }: SectionProps) {
  const t = useTranslations("landing.painSolution");
  const titleFadeIn = useFadeInUp();

  return (
    <section
      className={`py-20 md:py-28 bg-white ${className}`}
      aria-labelledby="pain-solution-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="text-center mb-12"
        >
          <h2
            id="pain-solution-title"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-eatrivo-black-primary mb-4"
          >
            {t("title")}
          </h2>
          <p className="text-lg text-eatrivo-gray max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.header>

        <div
          className="max-w-4xl mx-auto space-y-3 md:space-y-4"
          role="list"
          aria-label="Problems and solutions"
        >
          {painPointKeys.map((key, index) => (
            <ComparisonRow
              key={key}
              problem={t(`items.${key}.problem`)}
              solution={t(`items.${key}.solution`)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PainSolution;
