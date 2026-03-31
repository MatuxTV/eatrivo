"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight, ArrowDown } from "lucide-react";
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
      <p className="text-eatrivo-black-primary font-medium text-sm sm:text-base">
        {text}
      </p>
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
      <p className="text-eatrivo-black-primary font-medium text-sm sm:text-base">
        {text}
      </p>
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
      className="group cursor-default"
      role="listitem"
    >
      {/*
        Mobile layout: vertical stack (pain → arrow → solution) so users can
        clearly read the before/after relationship in a single-column flow.
        Desktop layout: horizontal three-column grid with the horizontal arrow.

        Fix: the original code hid the arrow entirely on mobile (`hidden md:flex`),
        leaving no visual transition between the pain and solution cards. On mobile
        we now render a small downward arrow between the two cards so the causal
        flow is always communicated regardless of screen width.
      */}
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-center">
        <PainCard text={problem} />

        {/* Desktop: horizontal arrow */}
        <div
          className="hidden md:flex items-center justify-center"
          aria-hidden="true"
        >
          <motion.div
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
          >
            <ArrowRight className="w-5 h-5 text-eatrivo-purple/40 group-hover:text-eatrivo-purple transition-colors duration-200" />
          </motion.div>
        </div>

        {/* Mobile: downward arrow — visible only below md */}
        <div
          className="flex md:hidden items-center justify-center py-0.5"
          aria-hidden="true"
        >
          <ArrowDown className="w-4 h-4 text-eatrivo-purple/40" />
        </div>

        <SolutionCard text={solution} />
      </div>
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

        {/* Before / After column headers — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-4 max-w-4xl mx-auto mb-4 px-1"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-eatrivo-red/50" />
            <span className="text-xs font-semibold text-eatrivo-red/70 uppercase tracking-widest">
              {t("beforeLabel")}
            </span>
          </div>
          <div className="w-5" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-eatrivo-green/60" />
            <span className="text-xs font-semibold text-eatrivo-green/80 uppercase tracking-widest">
              {t("afterLabel")}
            </span>
          </div>
        </motion.div>

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
