"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFadeInUp } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

const faqKeys = ["free", "time", "cancel", "vegan", "allergies"] as const;

interface AccordionItemProps {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function AccordionItem({ id, question, answer, isOpen, onToggle, index }: AccordionItemProps) {
  const headingId = `faq-${id}-heading`;
  const panelId = `faq-${id}-panel`;
  const fadeInUp = useFadeInUp(index * 0.05);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
    >
      <h3>
        <button
          id={headingId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-eatrivo-light/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple focus-visible:ring-inset"
        >
          <span className="font-medium text-eatrivo-black-primary pr-8">
            {question}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            <ChevronDown className="w-5 h-5 text-eatrivo-gray flex-shrink-0" />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-eatrivo-gray leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ({ className = "" }: SectionProps) {
  const t = useTranslations("landing.faq");
  const [openId, setOpenId] = useState<string | null>(null);
  const titleFadeIn = useFadeInUp();

  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section
      className={`py-20 md:py-28 bg-eatrivo-light ${className}`}
      aria-labelledby="faq-title"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.header
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleFadeIn}
          className="text-center mb-12"
        >
          <h2
            id="faq-title"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-eatrivo-black-primary mb-4"
          >
            {t("title")}
          </h2>
        </motion.header>

        <div
          className="space-y-3"
          role="group"
          aria-label="FAQ"
        >
          {faqKeys.map((key, index) => (
            <AccordionItem
              key={key}
              id={key}
              question={t(`items.${key}.question`)}
              answer={t(`items.${key}.answer`)}
              isOpen={openId === key}
              onToggle={() => handleToggle(key)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
