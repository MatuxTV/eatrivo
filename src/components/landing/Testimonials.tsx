"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFadeInUp, useStaggerContainer } from "@/hooks/useAnimations";
import type { SectionProps, TestimonialItem } from "@/types/landing";
import { colorClassMap } from "@/types/landing";

const testimonials: readonly TestimonialItem[] = [
  { id: "martin", initials: "MK", color: "purple", rating: 5 },
  { id: "katarina", initials: "KS", color: "pink", rating: 5 },
  { id: "peter", initials: "PM", color: "blue", rating: 5 },
] as const;

interface TestimonialCardProps {
  testimonial: TestimonialItem;
  name: string;
  detail: string;
  quote: string;
}

function TestimonialCard({ testimonial, name, detail, quote }: TestimonialCardProps) {
  const fadeInUp = useFadeInUp();
  const colors = colorClassMap[testimonial.color];

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-eatrivo-purple/10 transition-shadow duration-300 flex flex-col"
    >
      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-5`}>
        <Quote className={`w-5 h-5 ${colors.text}`} aria-hidden="true" />
      </div>

      <blockquote className="text-eatrivo-black-primary leading-relaxed text-base mb-6 flex-1">
        &ldquo;{quote}&rdquo;
      </blockquote>

      <div className="flex items-center gap-1 mb-4" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 fill-eatrivo-yellow text-eatrivo-yellow"
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div
          className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}
          aria-hidden="true"
        >
          <span className={`text-sm font-bold ${colors.text}`}>
            {testimonial.initials}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm text-eatrivo-black-primary">
            {name}
          </p>
          <p className="text-xs text-eatrivo-gray">{detail}</p>
        </div>
      </div>
    </motion.article>
  );
}

export function Testimonials({ className = "" }: SectionProps) {
  const t = useTranslations("landing.testimonials");
  const staggerContainer = useStaggerContainer({ staggerChildren: 0.1 });
  const titleFadeIn = useFadeInUp();

  return (
    <section
      className={`py-20 md:py-28 bg-eatrivo-light ${className}`}
      aria-labelledby="testimonials-title"
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
            id="testimonials-title"
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
          className="grid md:grid-cols-3 gap-6 md:gap-8"
          role="list"
          aria-label="Testimonials"
        >
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              name={t(`items.${testimonial.id}.name`)}
              detail={t(`items.${testimonial.id}.detail`)}
              quote={t(`items.${testimonial.id}.quote`)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;
