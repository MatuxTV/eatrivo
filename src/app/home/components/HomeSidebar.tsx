"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";

import { motion } from "framer-motion";
import {
  User,
  LogOut,
  LayoutDashboard,
  CakeSlice,
  MessageCircleHeart,
  CookingPot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipStatus } from "@/lib/functions";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UserBadge } from "@/components/ui/UserBadge";
import {
  type AppHomeSection,
  getPrimaryAppHomeSection,
} from "../types/navigation";

interface HomeSidebarProps {
  activeSection: AppHomeSection;
  onSectionChange: (section: AppHomeSection) => void;
}
export default function HomeSidebar({
  activeSection,
  onSectionChange,
}: HomeSidebarProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const t = useTranslations("home");

  const signOutHref = "/signout";

  const primaryActiveSection = getPrimaryAppHomeSection(activeSection);

  const navItems = [
    {
      id: "home" as const,
      label: t("nav.home"),
      icon: LayoutDashboard,
    },
    {
      id: "chatWithRivo" as const,
      label: t("nav.chatWithRivo"),
      icon: MessageCircleHeart,
    },
    {
      id: "pantry" as const,
      label: t("nav.pantry"),
      icon: CakeSlice,
    },
    {
      id: "kitchenCounter" as const,
      label: t("nav.kitchenCounter"),
      icon: CookingPot,
    },
  ];

  const mobileNavItems = [
    ...navItems,
    { id: "profile" as const, label: t("nav.profile"), icon: User },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0"
      >
        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || t("userAlt")}
                    width={48}
                    height={48}
                    className="rounded-full ring-2 ring-eatrivo-purple/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-eatrivo-purple" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-sm font-bold text-gray-900 truncate">
                    {user?.name}
                  </h2>
                  {user?.badges?.map((badgeStr) => (
                    <UserBadge key={badgeStr} type={badgeStr} />
                  ))}
                </div>
                <p
                  className={`text-xs capitalize ${getMembershipStatus(
                    user?.membership,
                  )}`}
                >
                  {user?.membership || "basic"} {t("membershipSuffix")}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className={`flex-1 border-2 text-xs h-8 ${primaryActiveSection === "profile" ? "bg-eatrivo-purple/10 border-eatrivo-purple/20 text-eatrivo-purple" : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"}`}
                onClick={() => onSectionChange("profile")}
              >
                <User className="w-3 h-3 mr-1.5" />
                {t("nav.profile")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-eatrivo-red"
                asChild
              >
                <Link href={signOutHref} aria-label={t("nav.signOut")}>
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">{t("nav.signOut")}</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = primaryActiveSection === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onSectionChange(item.id)}
                className={`
                  w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium h-auto
                  ${
                    isActive
                      ? "bg-eatrivo-purple/10 text-eatrivo-purple hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <div className="relative">
                  <item.icon
                    className={`w-4 h-4 ${isActive ? "text-eatrivo-purple" : "text-gray-400"}`}
                  />
                  {item.id === "chatWithRivo" && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                </div>
                {item.label}
              </Button>
            );
          })}
        </nav>
      </motion.div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileNavItems.map((item) => {
          const isActive = primaryActiveSection === item.id;
          const isDisabled = false;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSectionChange(item.id)}
              className={`
                relative flex flex-1 flex-col items-center justify-center gap-1
                min-h-[56px] py-2 transition-colors
                ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                ${isActive ? "text-eatrivo-purple" : "text-gray-400"}
              `}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.id === "chatWithRivo" && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
