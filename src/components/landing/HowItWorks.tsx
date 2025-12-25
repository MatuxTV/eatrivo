"use client";

import { motion } from "framer-motion";
import { UserPlus, FileText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("landing");

  const steps = [
    {
      id: 1,
      title: t("howItWorks.steps.registration.title"),
      description: t("howItWorks.steps.registration.description"),
      icon: UserPlus,
      color: "bg-blue-500",
    },
    {
      id: 2,
      title: t("howItWorks.steps.plan.title"),
      description: t("howItWorks.steps.plan.description"),
      icon: FileText,
      color: "bg-eatrivo-purple",
    },
    {
      id: 3,
      title: t("howItWorks.steps.done.title"),
      description: t("howItWorks.steps.done.description"),
      icon: Sparkles,
      color: "bg-green-500",
    },
  ];

  return (
    <section className="py-24 bg-gray-50 overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold tracking-tighter text-gray-900 mb-4"
          >
            {t("howItWorks.title")}
          </motion.h2>
          <p className="text-lg text-gray-600">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10" />

          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative flex flex-col items-center text-center"
            >
              <div
                className={`w-24 h-24 rounded-3xl ${step.color} bg-opacity-10 flex items-center justify-center mb-6 relative group`}
              >
                <div
                  className={`absolute inset-0 ${step.color} opacity-10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500`}
                />
                <div
                  className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center text-white shadow-lg relative z-10`}
                >
                  <step.icon className="w-8 h-8" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full border-4 border-gray-50 flex items-center justify-center font-bold text-gray-400 text-sm">
                  {step.id}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
