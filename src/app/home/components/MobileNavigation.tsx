"use client";

import { useState, useEffect } from "react";
import type { ButtonHTMLAttributes, ElementType } from "react";
import {
  LayoutDashboard,
  User,
  CakeSlice,
  MessageCircleHeart,
  MessageSquarePlus,
  CookingPot,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useTranslations } from "next-intl";
import { FeedbackDialog } from "@/components/FeedbackButton";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  type AppHomeSection,
  getPrimaryAppHomeSection,
} from "../types/navigation";

interface MobileNavigationProps {
  activeSection: AppHomeSection;
  onSectionChange: (section: AppHomeSection) => void;
}

export default function MobileNavigation({
  activeSection,
  onSectionChange,
}: MobileNavigationProps) {
  const t = useTranslations("home");
  const triggerHaptic = useHapticFeedback();
  const [showTooltip, setShowTooltip] = useState(false);
  const primaryActiveSection = getPrimaryAppHomeSection(activeSection);
  const shouldReduceMotion = useReducedMotion();

  const indicatorTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring", duration: 0.35, bounce: 0.15 };

  useEffect(() => {
    // Show tooltip after 3 seconds
    const timer = setTimeout(() => {
      setShowTooltip(true);
      // Hide after 5 seconds of showing
      const hideTimer = setTimeout(() => setShowTooltip(false), 8000);
      return () => clearTimeout(hideTimer);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSectionChange = (section: AppHomeSection) => {
    triggerHaptic("light");
    onSectionChange(section);
  };

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pointer-events-none">
        <nav
          aria-label={t("nav.home")}
          className="pointer-events-auto relative flex w-full max-w-[400px] h-16 items-center gap-1 rounded-full border border-black/[0.06] bg-white/90 px-2 shadow-[0_8px_32px_rgba(17,12,34,0.12),0_2px_8px_rgba(17,12,34,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/75"
        >
          <IslandItem
            data-tutorial-anchor="nav-home"
            label={t("nav.home")}
            icon={LayoutDashboard}
            isActive={primaryActiveSection === "home"}
            indicatorTransition={indicatorTransition}
            onClick={() => handleSectionChange("home")}
          />
          <IslandItem
            data-tutorial-anchor="nav-pantry"
            label={t("nav.pantry")}
            icon={CakeSlice}
            isActive={primaryActiveSection === "pantry"}
            indicatorTransition={indicatorTransition}
            onClick={() => handleSectionChange("pantry")}
          />

          {/* Rivo hero action */}
          <button
            type="button"
            data-tutorial-anchor="nav-chat"
            aria-label={t("nav.chatWithRivo")}
            aria-current={
              primaryActiveSection === "chatWithRivo" ? "page" : undefined
            }
            onClick={() => handleSectionChange("chatWithRivo")}
            className="relative flex h-12 flex-1 items-center justify-center rounded-full touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-transform duration-150 ease-out active:scale-[0.92]"
          >
            {primaryActiveSection === "chatWithRivo" && (
              <motion.span
                layoutId="mobile-nav-island-active"
                className="absolute inset-0 rounded-full bg-eatrivo-purple/10"
                transition={indicatorTransition}
              />
            )}
            <span
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-eatrivo-purple text-white shadow-[0_4px_14px_rgba(123,63,242,0.35)] transition-shadow duration-150 ${
                primaryActiveSection === "chatWithRivo"
                  ? "ring-4 ring-eatrivo-purple/15"
                  : ""
              }`}
            >
              <MessageCircleHeart className="h-5 w-5" strokeWidth={2.2} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-eatrivo-green" />
            </span>
          </button>

          <IslandItem
            label={t("nav.kitchenCounter")}
            icon={CookingPot}
            isActive={primaryActiveSection === "kitchenCounter"}
            indicatorTransition={indicatorTransition}
            onClick={() => handleSectionChange("kitchenCounter")}
          />
          <IslandItem
            label={t("nav.profile")}
            icon={User}
            isActive={primaryActiveSection === "profile"}
            indicatorTransition={indicatorTransition}
            onClick={() => handleSectionChange("profile")}
          />
        </nav>
      </div>

      {/* Floating Feedback Button — only on home section */}
      {primaryActiveSection === "home" && (
        <div className="md:hidden fixed right-4 z-50 bottom-[calc(88px+env(safe-area-inset-bottom))] flex flex-row items-center gap-4 pointer-events-none">
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                className="bg-eatrivo-purple px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold text-white pointer-events-auto relative"
              >
                {"Napíšte nám 👋"}
                <div className="absolute top-1/2 -right-1 w-2 h-2 bg-eatrivo-purple rotate-45 -translate-y-1/2"></div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-auto">
            <FeedbackDialog>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  boxShadow: [
                    "0 0 0 0px rgba(139, 92, 246, 0.4)",
                    "0 0 0 10px rgba(139, 92, 246, 0)",
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  },
                }}
                className="w-12 h-12 bg-gradient-to-tr from-eatrivo-purple to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <MessageSquarePlus className="w-6 h-6" />
              </motion.button>
            </FeedbackDialog>
          </div>
        </div>
      )}
    </>
  );
}

function IslandItem({
  label,
  icon: Icon,
  isActive,
  indicatorTransition,
  onClick,
  ...rest
}: {
  label: string;
  icon: ElementType;
  isActive: boolean;
  indicatorTransition: Transition;
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className="relative flex h-12 flex-1 items-center justify-center rounded-full touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-transform duration-150 ease-out active:scale-[0.92]"
    >
      {isActive && (
        <motion.span
          layoutId="mobile-nav-island-active"
          className="absolute inset-0 rounded-full bg-eatrivo-purple/10"
          transition={indicatorTransition}
        />
      )}
      <Icon
        className={`relative z-10 h-6 w-6 transition-colors duration-150 ${
          isActive ? "text-eatrivo-purple" : "text-gray-500"
        }`}
        strokeWidth={isActive ? 2.4 : 1.9}
      />
    </button>
  );
}
