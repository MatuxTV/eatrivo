"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Scale, Dumbbell, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useFadeInUp,
  useStaggerContainer,
} from "@/hooks/useAnimations";
import type { SectionProps, GoalItem } from "@/types/landing";
import { colorClassMap } from "@/types/landing";

const goals: readonly GoalItem[] = [
  { id: "loseWeight", icon: TrendingDown, color: "green" },
  { id: "maintain", icon: Scale, color: "blue" },
  { id: "gainMuscle", icon: Dumbbell, color: "orange" },
] as const;

interface GoalCardProps {
  goal: GoalItem;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

function GoalCard({ goal, title, description, isSelected, onSelect }: GoalCardProps) {
  const fadeInUp = useFadeInUp();
  const colors = colorClassMap[goal.color];
  const Icon = goal.icon;

  return (
    <motion.button
      variants={fadeInUp}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={onSelect}
      className={`relative bg-white rounded-3xl p-8 text-center group cursor-pointer transition-all duration-300 w-full ${
        isSelected
          ? "border-2 border-eatrivo-purple shadow-lg shadow-eatrivo-purple/10 ring-4 ring-eatrivo-purple/5"
          : "border border-gray-100 shadow-sm hover:shadow-xl hover:border-eatrivo-purple/20"
      }`}
      aria-pressed={isSelected}
      aria-labelledby={`goal-title-${goal.id}`}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-7 h-7 bg-eatrivo-purple rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      <div className="text-center">
        <div
          className={`w-20 h-20 mx-auto rounded-2xl ${colors.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${
            isSelected ? "scale-110" : ""
          }`}
          aria-hidden="true"
        >
          <Icon className={`w-10 h-10 ${colors.text}`} />
        </div>
        <h3
          id={`goal-title-${goal.id}`}
          className="text-xl font-bold text-eatrivo-black-primary mb-2"
        >
          {title}
        </h3>
        <p className="text-sm text-eatrivo-gray leading-relaxed">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

export function GoalsSection({ className = "" }: SectionProps) {
  const t = useTranslations("landing.goals");
  const staggerContainer = useStaggerContainer({ staggerChildren: 0.1 });
  const titleFadeIn = useFadeInUp();
  const [selectedGoal, setSelectedGoal] = useState<string>("loseWeight");

  return (
    <section
      id="goals"
      className={`py-20 md:py-28 bg-eatrivo-light ${className}`}
      aria-labelledby="goals-title"
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
            id="goals-title"
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
          className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto"
          role="group"
          aria-label="Goals"
        >
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              title={t(`${goal.id}.title`)}
              description={t(`${goal.id}.description`)}
              isSelected={selectedGoal === goal.id}
              onSelect={() => setSelectedGoal(goal.id)}
            />
          ))}
        </motion.div>

        {selectedGoal && (
          <motion.div
            key={selectedGoal}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`mt-12 max-w-4xl mx-auto rounded-3xl p-8 md:p-10 ${
              selectedGoal === "loseWeight"
                ? "bg-green-50/80 border-2 border-green-100"
                : selectedGoal === "maintain"
                ? "bg-blue-50/80 border-2 border-blue-100"
                : "bg-orange-50/80 border-2 border-orange-100"
            }`}
          >
            <div className="space-y-6">
              <h3
                className={`text-2xl md:text-3xl font-bold ${
                  selectedGoal === "loseWeight"
                    ? "text-green-700"
                    : selectedGoal === "maintain"
                    ? "text-blue-700"
                    : "text-orange-700"
                }`}
              >
                {t(`${selectedGoal}.detailTitle`)}
              </h3>
              <p className="text-base md:text-lg text-eatrivo-gray leading-relaxed">
                {t(`${selectedGoal}.detailDescription`)}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-xl ${
                    selectedGoal === "loseWeight"
                      ? "bg-green-100/50"
                      : selectedGoal === "maintain"
                      ? "bg-blue-100/50"
                      : "bg-orange-100/50"
                  }`}
                >
                  <h4 className="font-semibold text-eatrivo-black-primary mb-2">
                    {t(`${selectedGoal}.feature1Title`)}
                  </h4>
                  <p className="text-sm text-eatrivo-gray">
                    {t(`${selectedGoal}.feature1Description`)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-xl ${
                    selectedGoal === "loseWeight"
                      ? "bg-green-100/50"
                      : selectedGoal === "maintain"
                      ? "bg-blue-100/50"
                      : "bg-orange-100/50"
                  }`}
                >
                  <h4 className="font-semibold text-eatrivo-black-primary mb-2">
                    {t(`${selectedGoal}.feature2Title`)}
                  </h4>
                  <p className="text-sm text-eatrivo-gray">
                    {t(`${selectedGoal}.feature2Description`)}
                  </p>
                </div>
              </div>
              <p className="text-base text-eatrivo-gray text-center pt-4 border-t border-gray-200/50">
                {t("bottomText")}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default GoalsSection;
