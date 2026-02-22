"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  User,
  CakeSlice,
  MessageCircleHeart,
  MessageSquarePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FeedbackDialog } from "@/components/FeedbackButton";

interface MobileNavigationProps {
  activeSection: "dashboard" | "pantry" | "chatWithRivo" | "profile";
  onSectionChange: (
    section: "dashboard" | "pantry" | "chatWithRivo" | "profile",
  ) => void;
}

export default function MobileNavigation({
  activeSection,
  onSectionChange,
}: MobileNavigationProps) {
  const t = useTranslations("dashboard");
  const [showTooltip, setShowTooltip] = useState(false);

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

  const navItems = [
    { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { id: "pantry", label: t("nav.pantry"), icon: CakeSlice },
    {
      id: "chatWithRivo",
      label: t("nav.chatWithRivo"),
      icon: MessageCircleHeart,
    },
  ] as const;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
      {/* Floating Feedback Button */}
      <div className="absolute bottom-full mb-4 right-4 z-50 flex flex-row items-center gap-4 pointer-events-none">
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

      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute top-0 w-12 h-1 bg-eatrivo-purple rounded-b-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 mb-1 transition-colors duration-200 ${
                  isActive ? "text-eatrivo-purple" : "text-gray-400"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-eatrivo-purple" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Profile Link (Embedded) */}
        <button
          onClick={() => onSectionChange("profile")}
          className="relative flex flex-col items-center justify-center w-full h-full"
        >
          {activeSection === "profile" && (
            <motion.div
              layoutId="mobile-nav-active"
              className="absolute top-0 w-12 h-1 bg-eatrivo-purple rounded-b-full"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <User
            className={`w-5 h-5 mb-1 transition-colors duration-200 ${
              activeSection === "profile"
                ? "text-eatrivo-purple"
                : "text-gray-400"
            }`}
          />
          <span
            className={`text-[10px] font-medium transition-colors duration-200 ${
              activeSection === "profile"
                ? "text-eatrivo-purple"
                : "text-gray-500"
            }`}
          >
            {t("nav.profile")}
          </span>
        </button>
      </div>
    </div>
  );
}
