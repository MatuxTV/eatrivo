"use client";

/**
 * Hero Section - Yazio Style
 *
 * Light background, headline at top, phone mockups at bottom.
 * Phone mockups designed for real screenshot insertion.
 */

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { useFadeInUp, useStaggerContainer } from "@/hooks/useAnimations";
import type { SectionProps } from "@/types/landing";

// ============================================================================
// Phone Mockup Component (for screenshots)
// ============================================================================

interface PhoneMockupProps {
  screenshotSrc?: string;
  screenshotAlt?: string;
  delay?: number;
  rotation?: number;
  className?: string;
}

function PhoneMockup({
  screenshotSrc,
  screenshotAlt = "App screenshot",
  delay = 0,
  rotation = 0,
  className = "",
}: PhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`relative ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Phone frame - iPhone style */}
      <div className="relative bg-white rounded-[2rem] p-1 shadow-2xl border border-gray-200">
        {/* Screen container */}
        <div className="bg-eatrivo-black-primary rounded-[1.75rem] p-[2px]">
          <div className="bg-white rounded-[1.6rem] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[60px] h-[18px] bg-eatrivo-black-primary rounded-full z-10" />

            {/* Screen content area */}
            <div className="aspect-[9/19] bg-eatrivo-light relative">
              {screenshotSrc ? (
                <Image
                  src={screenshotSrc}
                  alt={screenshotAlt}
                  fill
                  className="object-cover object-top"
                  sizes="250px"
                />
              ) : (
                /* Placeholder for screenshot */
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-eatrivo-purple/5 to-eatrivo-pink/5">
                  <div className="text-center text-eatrivo-gray/40 px-4">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-eatrivo-purple/10 flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                    <p className="text-xs font-medium">Screenshot</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Hero Section
// ============================================================================

export function HeroSection({ className = "" }: SectionProps) {
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const stagger = useStaggerContainer({ delayChildren: 0.1 });
  const fadeInUp = useFadeInUp();

  return (
    <section
      className={`relative overflow-hidden bg-eatrivo-light ${className}`}
      aria-label="Úvodná sekcia"
    >
      {/* Animated background orbs with Framer Motion */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Purple orb - top left */}
        <motion.div
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-eatrivo-purple/15 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pink orb - top right */}
        <motion.div
          className="absolute -top-10 -right-20 w-[400px] h-[400px] rounded-full bg-eatrivo-pink/12 blur-3xl"
          animate={{
            x: [0, -25, 0],
            y: [0, 30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Blue orb - bottom */}
        <motion.div
          className="absolute bottom-0 left-1/3 w-[600px] h-[400px] rounded-full bg-eatrivo-blue/8 blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Content container */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Text content - TOP */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center pt-24 md:pt-32 pb-8"
        >
          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-eatrivo-black-primary"
          >
            Zdravé stravovanie
            <br />
            bez komplikácií
          </motion.h1>

          {/* CTA Button */}
          <motion.div variants={fadeInUp} className="mb-4">
            <Link href={`/${locale}/signin`}>
              <Button
                size="lg"
                className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-eatrivo-purple/25 hover:shadow-xl hover:shadow-eatrivo-purple/35 transition-all"
              >
                {tCommon("startFree")}
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>

          {/* Subtitle */}
          <motion.p variants={fadeInUp} className="text-sm text-eatrivo-gray">
            Vytvor si personalizovaný plán za pár minút
          </motion.p>
        </motion.div>

        {/* Phone Mockups - BOTTOM */}
        <div className="relative h-[320px] sm:h-[380px] md:h-[420px] mt-4">
          {/* Center phone - main */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[180px] sm:w-[200px] md:w-[220px] z-30">
            <PhoneMockup
              screenshotSrc="/images/screenshots/dashboard.png"
              screenshotAlt="EatRivo dashboard"
              delay={0.2}
            />
          </div>

          {/* Left phone */}
          <div className="absolute left-[5%] sm:left-[10%] md:left-[15%] bottom-[-20px] w-[140px] sm:w-[160px] md:w-[180px] z-20">
            <PhoneMockup
              screenshotSrc="/images/screenshots/health-circle.png"
              screenshotAlt="Jedálny plán"
              delay={0.3}
              rotation={-8}
            />
          </div>

          {/* Right phone */}
          <div className="absolute right-[5%] sm:right-[10%] md:right-[15%] bottom-[-20px] w-[140px] sm:w-[160px] md:w-[180px] z-20">
            <PhoneMockup
              screenshotSrc="/images/screenshots/shopping-list.png"
              screenshotAlt="Nákupný zoznam"
              delay={0.4}
              rotation={8}
            />
          </div>
        </div>
      </div>

      {/* Bottom fade to white */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none z-40"
        aria-hidden="true"
      />
    </section>
  );
}

export default HeroSection;
