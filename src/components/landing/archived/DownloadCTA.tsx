"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { useFadeInUp } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";
import { trackClientEvent, trackInteraction } from "@/lib/analytics/analytics-client";

export function DownloadCTA({ className = "" }: SectionProps) {
  const t = useTranslations("landing.downloadCta");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const fadeInUp = useFadeInUp();

  return (
    <section
      className={`py-20 md:py-28 bg-gradient-to-br from-eatrivo-purple via-eatrivo-purple/95 to-eatrivo-purple/85 relative overflow-hidden ${className}`}
      aria-labelledby="download-cta-title"
    >
      {/* Background orbs — layered for depth */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-eatrivo-pink/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/3 rounded-full blur-3xl"
          animate={{ rotate: [0, 8, 0, -8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center space-y-6"
        >
          {/* Headline — identity-forward, reflective layer */}
          <motion.h2
            id="download-cta-title"
            variants={fadeInUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight max-w-2xl mx-auto"
          >
            {t("title")}
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-white/80 max-w-xl mx-auto"
          >
            {t("subtitle")}
          </motion.p>

          {/* CTA button with motion wrapper */}
          <motion.div variants={fadeInUp}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Link
                href={`/${locale}`}
                onClick={() => {
                  trackClientEvent({
                    eventName: "landing_cta_clicked",
                    metadata: {
                      cta_id: "download_cta_primary",
                      cta_label: "start_free",
                      destination: "signin",
                      section: "download_cta",
                      locale,
                    },
                  });

                  trackInteraction({
                    componentName: "DownloadCTA",
                    action: "click",
                    metadata: { destination: "signin" },
                  });
                }}
              >
                <Button
                  size="lg"
                  className="bg-white text-eatrivo-purple hover:bg-white/95 rounded-full px-10 h-14 sm:h-16 text-base sm:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-eatrivo-purple"
                >
                  {tCommon("startFree")}
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust text with shield icon */}
          <motion.div
            variants={fadeInUp}
            className="flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-white/50" aria-hidden="true" />
            <p className="text-sm text-white/60">{t("trustText")}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default DownloadCTA;
