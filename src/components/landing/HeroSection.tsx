"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShoppingCart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import type { SectionProps } from "@/types/landing";

function PhoneMockup({
  src,
  alt = "Screenshot",
  delay = 0,
  isCenter = false,
}: {
  src?: string;
  alt?: string;
  delay?: number;
  isCenter?: boolean;
}) {
  // Mobile-first widths: center phone is larger, side phones are smaller.
  // On mobile only the center phone renders, so we keep it from being too
  // wide on a 320px viewport (200px is safe — leaves 60px gutter each side).
  const width = isCenter
    ? "w-[180px] xs:w-[200px] sm:w-[220px] md:w-[180px] lg:w-[200px]"
    : "w-[120px] sm:w-[140px] md:w-[150px] lg:w-[170px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={width}
    >
      <div className="bg-[#1f1f1f] rounded-[1.5rem] p-[2px] shadow-xl">
        <div className="bg-[#1f1f1f] rounded-[1.4rem] p-[1px]">
          <div className="bg-white rounded-[1.3rem] overflow-hidden">
            {/* Notch */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-3 bg-[#1f1f1f] rounded-full z-10" />
            {/* Screen */}
            <div className="aspect-[9/19] bg-gray-100 relative">
              {src ? (
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 180px, 220px"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-[8px] text-center px-2">
                  App screenshot placeholder
                  <br />
                  Add image at /public/screenshots/
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection({ className = "" }: SectionProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("landing.hero");

  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      setMousePosition({ x: -1000, y: -1000 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const dotsGrid = [];
  const cols = 30;
  const rows = 20;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dotsGrid.push({ id: `${i}-${j}`, x: j, y: i });
    }
  }

  return (
    <section className={`relative overflow-hidden bg-eatrivo-white-primary ${className}`}>
      {/* Mouse-interactive dots background — hidden on mobile, no hover on touch */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {dotsGrid.map((dot) => {
          const dotX = (dot.x / cols) * 100;
          const dotY = (dot.y / rows) * 100;

          const dotScreenX =
            (dotX / 100) * (typeof window !== "undefined" ? window.innerWidth : 1920);
          const dotScreenY =
            (dotY / 100) * (typeof window !== "undefined" ? window.innerHeight : 1080);
          const distX = mousePosition.x - dotScreenX;
          const distY = mousePosition.y - dotScreenY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          const repulsionRadius = 150;
          let offsetX = 0;
          let offsetY = 0;

          if (isHovering && distance < repulsionRadius) {
            const force = (repulsionRadius - distance) / repulsionRadius;
            const angle = Math.atan2(distY, distX);
            offsetX = -Math.cos(angle) * force * 40;
            offsetY = -Math.sin(angle) * force * 40;
          }

          return (
            <motion.div
              key={dot.id}
              className="absolute w-1.5 h-1.5 rounded-full bg-eatrivo-purple"
              style={{ left: `${dotX}%`, top: `${dotY}%` }}
              animate={
                isHovering
                  ? {
                      x: offsetX,
                      y: offsetY,
                      opacity: distance < repulsionRadius ? 0.15 : 0.08,
                    }
                  : {
                      x: [0, Math.sin(dot.x * 0.5) * 10, 0],
                      y: [0, Math.cos(dot.y * 0.5) * 10, 0],
                      opacity: [0.08, 0.12, 0.08],
                    }
              }
              transition={
                isHovering
                  ? { type: "spring", stiffness: 120, damping: 20 }
                  : {
                      duration: 3 + (dot.x + dot.y) * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-0 pt-20 sm:pt-28 md:pt-32 pb-16 sm:pb-20 relative">
        {/* === PHONES === */}
        <div className="flex justify-center items-end gap-4 md:gap-6 relative z-0">
          {/* Left phone — hidden on mobile, one thumb cannot reach it anyway */}
          <div className="hidden md:block" style={{ transform: "rotate(-8deg)" }}>
            <PhoneMockup
              src={`/images/screenshots/${locale}/health-circle.png`}
              alt="Zdravie"
              delay={0.1}
            />
          </div>

          {/* Center phone — always visible, sole focus on mobile */}
          <div>
            <PhoneMockup
              src={`/images/screenshots/${locale}/dashboard.png`}
              alt="Dashboard"
              delay={0}
              isCenter
            />
          </div>

          {/* Right phone — hidden on mobile */}
          <div className="hidden md:block" style={{ transform: "rotate(8deg)" }}>
            <PhoneMockup
              src={`/images/screenshots/${locale}/shopping-list.png`}
              alt="Nákupný zoznam"
              delay={0.15}
            />
          </div>

          {/*
            Gradient fade from bottom of phones into the text content below.
            Mobile: shorter fade since only one phone is visible.
            The -bottom-20 offset ensures the gradient covers the phone bottom edge.
          */}
          <div className="absolute -bottom-20 left-0 right-0 h-[420px] sm:h-[450px] md:h-96 bg-gradient-to-t from-eatrivo-white-primary via-eatrivo-white-primary/95 via-55% to-transparent pointer-events-none z-10" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          // Mobile: -mt-36 is safe for a 180px-wide single phone.
          // sm: -mt-28 for slightly larger phone.
          // md+: -mt-28 unchanged since side phones add more visual height.
          className="relative z-20 text-center -mt-36 sm:-mt-28 md:-mt-28 px-4"
        >
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="inline-flex items-center gap-2 bg-eatrivo-purple/8 border border-eatrivo-purple/20 text-eatrivo-purple rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium mb-4 sm:mb-5"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {t("badge")}
          </motion.div>

          {/* Heading — mobile-first sizing: starts at 3xl (30px) to stay readable
              at 320px without overflowing, scales up at md/lg breakpoints */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-2 sm:mb-3">
            {t("titleLine1")}
          </h1>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink bg-clip-text text-transparent mb-6 sm:mb-8">
            {t("titleAccent")}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10">
            {t("description")}
          </p>

          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm md:text-base text-gray-700 mb-8 sm:mb-10">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-eatrivo-purple" aria-hidden="true" />
              {t("valueProp1")}
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-eatrivo-purple" aria-hidden="true" />
              {t("valueProp2")}
            </span>
          </div>

          {/* CTA — full-width on very small screens for maximum thumb reachability,
              auto width from sm upward */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="block sm:inline-block"
          >
            <Link href={`/${locale}/signin`}>
              <Button className="w-full sm:w-auto bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-7 sm:px-9 h-12 sm:h-14 text-sm sm:text-base font-semibold shadow-lg shadow-eatrivo-purple/30 transition-all duration-200">
                {t("cta")}
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust text */}
          <div className="flex items-center justify-center gap-1.5 mt-4 sm:mt-5">
            <Shield className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-gray-500">{t("trustText")}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
