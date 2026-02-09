"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import type { SectionProps } from "@/types/landing";

// Phone Mockup
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
  const width = isCenter
    ? "w-[200px] sm:w-[220px] md:w-[180px] lg:w-[200px]"
    : "w-[125px] sm:w-[150px] md:w-[150px] lg:w-[170px]";

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
                  sizes="170px"
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
  const tCommon = useTranslations("common");
  
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

  // Generate dots grid - more dots for better coverage
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
      {/* Mouse-interactive dots background - Hidden on mobile */}
      <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {dotsGrid.map((dot) => {
          const dotX = (dot.x / cols) * 100;
          const dotY = (dot.y / rows) * 100;
          
          // Calculate distance from mouse
          const dotScreenX = (dotX / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920);
          const dotScreenY = (dotY / 100) * (typeof window !== 'undefined' ? window.innerHeight : 1080);
          const distX = mousePosition.x - dotScreenX;
          const distY = mousePosition.y - dotScreenY;
          const distance = Math.sqrt(distX * distX + distY * distY);
          
          // Repulsion effect - dots move away from cursor like water from boat
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
              style={{
                left: `${dotX}%`,
                top: `${dotY}%`,
              }}
              animate={isHovering ? {
                x: offsetX,
                y: offsetY,
                opacity: distance < repulsionRadius ? 0.15 : 0.08,
              } : {
                x: [0, Math.sin(dot.x * 0.5) * 10, 0],
                y: [0, Math.cos(dot.y * 0.5) * 10, 0],
                opacity: [0.08, 0.12, 0.08],
              }}
              transition={isHovering ? {
                type: "spring",
                stiffness: 120,
                damping: 20,
              } : {
                duration: 3 + (dot.x + dot.y) * 0.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-0 pt-20 sm:pt-28 md:pt-32 pb-16 sm:pb-20 relative">
        {/* === PHONES === */}
        <div className="flex justify-center items-end gap-4 md:gap-6 relative z-0">
          {/* Left Phone - Hidden on mobile */}
          <div className="hidden md:block" style={{ transform: "rotate(-8deg)" }}>
            <PhoneMockup
              src="/images/screenshots/health-circle.png"
              alt="Zdravie"
              delay={0.1}
            />
          </div>
          
          {/* Center Phone - Always visible */}
          <div>
            <PhoneMockup
              src="/images/screenshots/dashboard.png"
              alt="Dashboard"
              delay={0}
              isCenter
            />
          </div>
          
          {/* Right Phone - Hidden on mobile */}
          <div className="hidden md:block" style={{ transform: "rotate(8deg)" }}>
            <PhoneMockup
              src="/images/screenshots/shopping-list.png"
              alt="Nákupný zoznam"
              delay={0.15}
            />
          </div>
          <div className="absolute -bottom-20 left-0 right-0 h-[500px] sm:h-[450px] md:h-96 bg-gradient-to-t from-eatrivo-white-primary via-eatrivo-white-primary/95 via-55% to-transparent pointer-events-none z-10" />
        </div>
        
        
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-20 text-center -mt-52 sm:-mt-28 md:-mt-28 px-4"
        >
          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-2 sm:mb-3">
            {t("titleLine1")}
          </h1>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink bg-clip-text text-transparent mb-6 sm:mb-8">
            {t("titleAccent")}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10">
            {t("description")}
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm md:text-base text-gray-700 mb-8 sm:mb-10">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-eatrivo-purple" />
              {t("valueProp1")}
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-eatrivo-purple" />
              {t("valueProp2")}
            </span>
          </div>

          {/* CTA */}
          <Link href={`/${locale}/signin`}>
            <Button className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-lg shadow-eatrivo-purple/25">
              {t("cta")}
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>

          {/* Note */}
          <p className="text-xs sm:text-sm text-gray-500 mt-5 sm:mt-6">
            {t("trustText")}
          </p>
        </motion.div>
      </div>
        
    </section>
  );
}
export default HeroSection;
