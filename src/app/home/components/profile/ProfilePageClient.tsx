"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Settings,
  ChefHat,
  Flame,
  UtensilsCrossed,
  Bookmark,
  CreditCard,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PersonalInfoSection from "./PersonalInfoSection";
import NutritionPreferencesSection from "./NutritionPreferencesSection";
import BookmarkedRecipesSection from "./BookmarkedRecipesSection";
import AppShellViewport from "@/app/home/components/AppShellViewport";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";

interface UserProfileData {
  fullName: string;
  email: string;
  dateOfBirth: string;
  membership: string;
  badges?: string[];
}

interface UserNutritionData {
  sex: "man" | "woman";
  height: number;
  weight: string | number;
  activity_level: string | null;
  goal: string | null;
  meal_per_day: number | null;
  cooking_time_pref: string | null;
  meal_prep: boolean | null;
  meal_prep_days: number | null;
  diet_preferences: string | null;
  budget_preference: string | null;
  likes: string | null;
  dislikes: string | null;
  allergies: string | null;
}

interface ProfilePageClientProps {
  onBack?: () => void;
  onOpenBookmarkedRecipe?: (recipe: BasicHomeRecipePreview) => void;
}

type ProfileView = "default" | "personal" | "nutrition" | "bookmarks" | "billing";

export default function ProfilePageClient({
  onBack: _onBack,
  onOpenBookmarkedRecipe,
}: ProfilePageClientProps) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const [activeView, setActiveView] = useState<ProfileView>("default");
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [nutritionData, setNutritionData] = useState<UserNutritionData | null>(
    null,
  );

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/user/profile");
        if (!response.ok) throw new Error("Failed to fetch profile");

        const data = await response.json();
        setProfileData(data.profile);
        setNutritionData(data.nutrition);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error(t("toast.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [t]);

  const displayName = profileData?.fullName?.trim() || t("header.fallbackName");
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const summaryStats = [
    {
      key: "cookedMeals",
      icon: ChefHat,
      value: 18,
      label: t("stats.cookedMeals.label"),
      helper: t("stats.placeholder"),
    },
    {
      key: "dayStreak",
      icon: Flame,
      value: 24,
      label: t("stats.dayStreak.label"),
      helper: t("stats.placeholder"),
    },
  ];

  const menuCards = [
    {
      key: "personal",
      title: t("menu.personal.title"),
      description: t("menu.personal.description"),
      icon: User,
      iconClassName: "text-[#7d49cf] bg-eatrivo-purple/10",
      action: () => {
        setNavDirection(1);
        setActiveView("personal");
      },
    },
    {
      key: "nutrition",
      title: t("menu.nutrition.title"),
      description: t("menu.nutrition.description"),
      icon: UtensilsCrossed,
      iconClassName: "text-[#7d49cf] bg-eatrivo-purple/10",
      action: () => {
        setNavDirection(1);
        setActiveView("nutrition");
      },
    },
    {
      key: "bookmarks",
      title: t("menu.bookmarks.title"),
      description: t("menu.bookmarks.description"),
      icon: Bookmark,
      iconClassName: "text-[#7d49cf] bg-eatrivo-purple/10",
      action: () => {
        setNavDirection(1);
        setActiveView("bookmarks");
      },
    },
    {
      key: "billing",
      title: t("menu.billing.title"),
      description: t("menu.billing.description"),
      icon: CreditCard,
      iconClassName: "text-[#7d49cf] bg-eatrivo-purple/10",
      action: () => {
        setNavDirection(1);
        setActiveView("billing");
      },
    },
    {
      key: "logout",
      title: t("menu.logout.title"),
      description: t("menu.logout.description"),
      icon: LogOut,
      iconClassName: "text-[#eb4d72] bg-eatrivo-red/10",
      action: () => router.push("/signout"),
    },
  ] as const;

  const slideVariants = {
    initial: (direction: 1 | -1) => ({
      opacity: 0,
      x: direction === 1 ? 64 : -64,
      scale: 0.985,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (direction: 1 | -1) => ({
      opacity: 0,
      x: direction === 1 ? -64 : 64,
      scale: 0.985,
    }),
  };

  const goBackToDefault = () => {
    setNavDirection(-1);
    setActiveView("default");
  };

  const renderDefaultView = () => (
    <motion.div
      key="default"
      custom={navDirection}
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 sm:space-y-6"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-[#f0e3ff] bg-white px-4 py-5 shadow-[0_24px_60px_rgba(121,78,171,0.12)] sm:px-6 sm:py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-12 -top-16 hidden h-40 w-40 rounded-full bg-[#ead6ff] opacity-80 blur-3xl sm:block" />
        <div className="pointer-events-none absolute -left-10 bottom-0 hidden h-32 w-32 rounded-full bg-[#ffe5ef] opacity-70 blur-3xl sm:block" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-[radial-gradient(circle_at_top,#4b2a69_0%,#241426_72%)] text-2xl font-black tracking-[-0.04em] text-white shadow-[0_18px_40px_rgba(58,27,79,0.38)] ring-4 ring-white sm:h-24 sm:w-24 sm:rounded-[2rem] sm:text-3xl">
                {initials || "E"}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#7d49cf] text-white ring-4 ring-[#fff7ff]">
                  <Settings className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2 sm:min-h-[8.5rem]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9b84b6] sm:text-[11px] sm:tracking-[0.24em]">
                  {t("header.kicker")}
                </p>
                <h1 className="text-2xl font-black leading-tight tracking-[-0.05em] text-[#35204f] sm:text-3xl lg:text-4xl">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="rounded-full bg-[#7d49cf] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(125,73,207,0.28)]">
                    {profileData?.membership?.toUpperCase() || "FREE"}
                  </span>
                  {(profileData?.badges?.length ?? 0) > 0 ? (
                    <span className="rounded-full bg-[#f5ecff] px-3 py-1.5 text-[11px] font-bold text-[#7d49cf] ring-1 ring-[#eadcff]">
                      {t("header.badgesCount", { count: profileData?.badges?.length ?? 0 })}
                    </span>
                  ) : null}
                </div>
                <p className="max-w-xl text-sm font-medium leading-6 text-[#87739f]">
                  {t("header.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {summaryStats.map((stat) => (
              <div
                key={stat.key}
                className="rounded-[1.6rem] bg-[linear-gradient(180deg,#fff8ff_0%,#f7efff_100%)] px-5 py-4 ring-1 ring-[#efe1ff]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#7d49cf] shadow-sm ring-1 ring-[#eadcff]">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[#4d2a75]">
                      {stat.value}
                    </p>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8f76ae]">
                      {stat.label}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a08abb] ring-1 ring-[#ece1f9]">
                    {stat.helper}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 sm:space-y-4">
        {menuCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.action}
            className="flex w-full items-center gap-3 rounded-[1.6rem] border border-[#f2e8fb] bg-white px-4 py-4 text-left shadow-[0_14px_34px_rgba(121,78,171,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(121,78,171,0.10)] sm:gap-4 sm:rounded-[1.8rem] sm:px-5 sm:py-5"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconClassName} sm:h-12 sm:w-12`}>
              <card.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-lg font-black tracking-[-0.04em] sm:text-xl ${card.key === "logout" ? "text-[#da325c]" : "text-[#35204f]"}`}>
                {card.title}
              </span>
              <span className={`mt-1 block text-sm font-medium ${card.key === "logout" ? "text-[#ef7b97]" : "text-[#87739f]"}`}>
                {card.description}
              </span>
            </span>
            <ChevronRight className={`h-5 w-5 shrink-0 ${card.key === "logout" ? "text-[#ef7b97]" : "text-[#af95cf]"}`} />
          </button>
        ))}
      </section>
    </motion.div>
  );

  const renderDetailShell = (content: React.ReactNode) => (
    <motion.div
      key={activeView}
      custom={navDirection}
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 sm:space-y-5"
    >
      <div className="flex justify-start">
        <button
          type="button"
          onClick={goBackToDefault}
          aria-label={t("navigation.backToProfile")}
          title={t("navigation.backToProfile")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#7d49cf] shadow-[0_12px_28px_rgba(121,78,171,0.12)] ring-1 ring-[#eadcff] transition-transform hover:scale-[1.03] active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
      {content}
    </motion.div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case "personal":
        return renderDetailShell(
          <PersonalInfoSection
            profileData={profileData}
            isLoading={isLoading}
            onUpdate={(data) => setProfileData(data)}
          />,
        );
      case "nutrition":
        return renderDetailShell(
          <NutritionPreferencesSection
            nutritionData={nutritionData}
            isLoading={isLoading}
            onUpdate={(data) => setNutritionData(data)}
          />,
        );
      case "billing":
        return renderDetailShell(
          <section
            className="rounded-[1.8rem] border border-[#efe2fb] bg-white p-6 shadow-[0_18px_40px_rgba(121,78,171,0.08)] sm:p-8"
          >
            <div className="space-y-4 rounded-[1.5rem] bg-[linear-gradient(180deg,#fdf8ff_0%,#f7eeff_100%)] p-5 ring-1 ring-[#eedfff]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#7d49cf] ring-1 ring-[#eadcff]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#35204f]">
                  {t("billingPlaceholder.title")}
                </h2>
                <p className="max-w-xl text-sm font-medium leading-6 text-[#87739f]">
                  {t("billingPlaceholder.description")}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6f6184] ring-1 ring-[#ece2f8]">
                {t("billingPlaceholder.helper")}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/${locale}/pricing`)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#7d49cf] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(125,73,207,0.25)] transition-colors hover:bg-[#6f3fc0]"
              >
                {t("billingPlaceholder.cta")}
              </button>
            </div>
          </section>,
        );
      case "bookmarks":
        return renderDetailShell(
          <BookmarkedRecipesSection
            isProfileLoading={isLoading}
            onOpenRecipe={(recipe) => {
              onOpenBookmarkedRecipe?.(recipe);
            }}
          />
        );
      case "default":
      default:
        return renderDefaultView();
    }
  };

  return (
    <AppShellViewport className="bg-[linear-gradient(180deg,#fffdfd_0%,#faf2ff_100%)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        <AnimatePresence mode="wait" custom={navDirection}>
          {renderActiveView()}
        </AnimatePresence>
      </div>
    </AppShellViewport>
  );
}