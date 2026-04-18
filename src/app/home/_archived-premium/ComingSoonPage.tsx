"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface ComingSoonPageProps {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  rivoImage: string;
  gradient: string;
  showBackButton?: boolean;
  className?: string;
  // New props for customization
  badgeKey?: string;
  features?: string[];
  ctaLabelKey?: string;
  secondaryLabelKey?: string;
  onCtaClick?: () => void;
  onSecondaryClick?: () => void;
}

export default function ComingSoonPage({
  titleKey,
  descriptionKey,
  icon,
  rivoImage,
  gradient,
  showBackButton = true,
  className = "min-h-screen bg-gray-50 flex items-center justify-center p-4",
  badgeKey,
  features,
  ctaLabelKey,
  secondaryLabelKey,
  onCtaClick,
  onSecondaryClick,
}: ComingSoonPageProps) {
  const t = useTranslations("home.comingSoon");

  const displayFeatures = features || [
    t("teaser.feature1"),
    t("teaser.feature2"),
    t("teaser.feature3"),
  ];

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-lg"
      >
        {/* Main Card */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
          {/* Decorative gradient blob */}
          <div
            className={`absolute -top-16 -right-16 w-48 h-48 ${gradient} rounded-full blur-3xl opacity-20`}
            aria-hidden="true"
          />
          <div
            className={`absolute -bottom-12 -left-12 w-36 h-36 ${gradient} rounded-full blur-3xl opacity-15`}
            aria-hidden="true"
          />

          <div className="relative z-10">
            {/* Rivo mascot */}
            <motion.div
              className="mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-6"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src={rivoImage}
                alt=""
                width={160}
                height={160}
                className="object-contain drop-shadow-lg"
                aria-hidden="true"
              />
            </motion.div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eatrivo-purple/10 text-eatrivo-purple text-sm font-bold mb-5 uppercase tracking-wider">
              {badgeKey ? (
                t(badgeKey)
              ) : (
                <>
                  <span className="w-2 h-2 bg-eatrivo-purple rounded-full animate-pulse" />
                  {t("badge")}
                </>
              )}
            </div>

            {/* Icon + Title */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-eatrivo-purple/10 flex items-center justify-center">
                {icon}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t(titleKey)}
              </h1>
            </div>

            {/* Description */}
            <p className="text-gray-500 leading-relaxed mb-8 max-w-sm mx-auto">
              {t(descriptionKey)}
            </p>

            {/* Teaser features */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {displayFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="bg-gray-50 rounded-xl p-3 text-xs font-medium text-gray-600"
                >
                  {feature}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {/* Primary CTA */}
              {ctaLabelKey && (
                <Button
                  onClick={onCtaClick}
                  className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-eatrivo-purple/20 mb-2"
                >
                  {t(ctaLabelKey)}
                </Button>
              )}

              {/* Secondary Action / Back Link */}
              {secondaryLabelKey ? (
                <button
                  onClick={onSecondaryClick}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {t(secondaryLabelKey)}
                </button>
              ) : (
                showBackButton && (
                  <Button
                    asChild
                    className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-eatrivo-purple/20"
                  >
                    <Link href="/home">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t("backToHome")}
                    </Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
