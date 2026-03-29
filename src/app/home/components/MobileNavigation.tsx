"use client";

import { useState, useEffect } from "react";
import type { ElementType } from "react";
import {
  LayoutDashboard,
  User,
  CakeSlice,
  MessageCircleHeart,
  MessageSquarePlus,
  CookingPot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FeedbackDialog } from "@/components/FeedbackButton";
import { MOBILE_BOTTOM_NAV_HEIGHT_CLASS } from "@/app/home/constants/app-shell";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const primaryActiveSection = getPrimaryAppHomeSection(activeSection);

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

  // navItems removed

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none ${MOBILE_BOTTOM_NAV_HEIGHT_CLASS}`}>
      {/* Floating Feedback Button — only on home section */}
      {primaryActiveSection === "home" && (
        <div className="absolute bottom-[90px] mb-2 right-4 z-50 flex flex-row items-center gap-4 pointer-events-none">
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

      {/* Main Bottom Nav Bar Background */}
      <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] pointer-events-auto flex items-center px-1">
        {/* LEFT NAV ITEMS */}
        <div className="flex flex-1 items-center justify-around h-full pr-8">
          <NavItem
            id="home"
            label={t("nav.home")}
            icon={LayoutDashboard}
            activeSection={primaryActiveSection}
            onClick={() => onSectionChange("home")}
          />
          <NavItem
            id="pantry"
            label={t("nav.pantry")}
            icon={CakeSlice}
            activeSection={primaryActiveSection}
            onClick={() => onSectionChange("pantry")}
          />
        </div>

        {/* RIGHT NAV ITEMS */}
        <div className="flex flex-1 items-center justify-around h-full pl-8">
          <NavItem
            id="kitchenCounter"
            label={t("nav.kitchenCounter")}
            icon={CookingPot}
            activeSection={primaryActiveSection}
            onClick={() => onSectionChange("kitchenCounter")}
          />
          <NavItem
            id="profile"
            label={t("nav.profile")}
            icon={User}
            activeSection={primaryActiveSection}
            onClick={() => onSectionChange("profile")}
          />
        </div>
      </div>

      {/* CENTER FLOATING ACTION BUTTON */}
      <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
        {/* Outer white halo to cut into the background (simulated clipping) */}
        <div className="bg-eatrivo-white-secondary p-1 rounded-full drop-shadow-sm flex items-center justify-center">
          <div className="bg-eatrivo-white-primary p-1 rounded-full flex items-center justify-center">
            <button
              onClick={() => onSectionChange("chatWithRivo")}
              className={`w-11 h-11 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 duration-200 relative ${
                primaryActiveSection === "chatWithRivo"
                  ? "bg-eatrivo-purple text-white shadow-eatrivo-purple/40 ring-4 ring-eatrivo-purple/20"
                  : "bg-eatrivo-purple/90 text-white hover:bg-eatrivo-purple"
              }`}
            >
              <MessageCircleHeart className="w-6 h-6" strokeWidth={2} />

              <span className="absolute top-[2px] right-[2px] flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eatrivo-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-eatrivo-green" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  id,
  label,
  icon: Icon,
  activeSection,
  onClick,
}: {
  id: string;
  label: string;
  icon: ElementType;
  activeSection: string;
  onClick: () => void;
}) {
  const isActive = activeSection === id;
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-full h-full pt-1 pb-1"
    >
      {isActive && (
        <motion.div
          layoutId="mobile-nav-active"
          className="absolute top-0 w-10 h-1 bg-eatrivo-purple rounded-b-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <div className="relative mb-1 mt-1">
        <Icon
          className={`w-[22px] h-[22px] transition-colors duration-200 ${
            isActive ? "text-eatrivo-purple" : "text-gray-400"
          }`}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </div>
      <span
        className={`text-[10px] font-medium transition-colors duration-200 ${
          isActive ? "text-eatrivo-purple" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
