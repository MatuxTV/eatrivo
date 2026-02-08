"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { useFadeInUp, useScaleIn } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

export function DownloadCTA({ className = "" }: SectionProps) {
  const t = useTranslations("landing.downloadCta");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const fadeInUp = useFadeInUp();
  const scaleIn = useScaleIn(0.2);

  return (
    <section
      className={`py-20 md:py-28 bg-gradient-to-br from-eatrivo-purple via-eatrivo-purple/95 to-eatrivo-purple/85 relative overflow-hidden ${className}`}
      aria-labelledby="download-cta-title"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-eatrivo-pink/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center space-y-6"
        >
          <motion.div
            variants={scaleIn}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-2 rounded-full"
          >
            <Zap className="w-4 h-4 text-eatrivo-yellow" aria-hidden="true" />
            <span className="text-white/90 text-sm font-medium">
              {t("badge")}
            </span>
          </motion.div>

          <motion.h2
            id="download-cta-title"
            variants={fadeInUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight"
          >
            {t("title")}
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-white/80 max-w-xl mx-auto"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Link href={`/${locale}/signin`}>
              <Button
                size="lg"
                className="bg-white text-eatrivo-purple hover:bg-white/95 rounded-full px-10 h-14 sm:h-16 text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-eatrivo-purple"
              >
                {tCommon("startFree")}
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-sm text-white/60">
            {t("trustText")}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

export default DownloadCTA;
