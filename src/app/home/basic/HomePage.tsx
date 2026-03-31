"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { APP_CONFIG } from "@/app/config/app";
import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { logger } from "@/lib/logger";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { normalizeRecipeInstructions } from "@/lib/recipe-instructions";
import type { CustomRecipeHeroSnapshot } from "../components/RivoCustomRecipeExperience";
import type {
  BasicHomePantrySummary,
  BasicHomeRecipePreview,
} from "@/app/home/types/data";
import {
  type AppHomeSection,
  getPrimaryAppHomeSection,
  isHomeSection,
} from "../types/navigation";

/* ---- Layout shells ---- */
import WelcomeDialog from "../components/WelcomeDialog";
import HomeSidebar from "../components/HomeSidebar";
import HomeHeader from "../components/HomeHeader";
import MobileNavigation from "../components/MobileNavigation";
import AppShellViewport from "../components/AppShellViewport";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { NotificationBanner } from "@/components/pwa/NotificationBanner";
import FeedbackButton from "@/components/FeedbackButton";

/* ---- Extracted modules ---- */
import { usePantrySync } from "@/hooks/usePantrySync";
import { useShoppingList } from "@/hooks/useShoppingList";
import RecipesSection from "../components/RecipesSection";
import PantrySection from "@/app/pantry/components/PantryPage";
import ProfilePageClient from "@/app/home/components/profile/ProfilePageClient";
import type {
  InitialPantrySectionData,
  UserNutritionSnapshot,
  UserProfileSnapshot,
} from "@/app/home/types/section-data";

const ChatWithRivoPage = dynamic(
  () => import("@/app/chat-with-rivo/ChatWithRivoPage"),
  {
    ssr: false,
  },
);
const KitchenCounterPage = dynamic(
  () => import("@/app/kitchen-counter/KitchenCounterPage"),
  {
    ssr: false,
  },
);
const ShoppingListSection = dynamic(
  () => import("../components/ShoppingListSection"),
);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY =
  "kitchenCounter:selectedRecipe";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readStoredKitchenCounterRecipe(): BasicHomeRecipePreview | null {
  if (typeof window === "undefined") return null;

  const stored = window.sessionStorage.getItem(
    KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
  );
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<BasicHomeRecipePreview>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.category !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      instructions: normalizeRecipeInstructions(parsed.instructions),
    } as BasicHomeRecipePreview;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface HomePageProps {
  featuredRecipes?: BasicHomeRecipePreview[];
  pantrySummary?: BasicHomePantrySummary;
  cookableRecipes?: BasicHomeRecipePreview[];
  almostCookableRecipes?: BasicHomeRecipePreview[];
  pantryNames?: string[];
  initialProfileData?: UserProfileSnapshot | null;
  initialNutritionData?: UserNutritionSnapshot | null;
  initialPantryData?: InitialPantrySectionData;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage({
  featuredRecipes = [],
  pantrySummary = { itemCount: 0, cookableCount: 0 },
  cookableRecipes = [],
  almostCookableRecipes = [],
  pantryNames = [],
  initialProfileData = null,
  initialNutritionData = null,
  initialPantryData,
}: HomePageProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const triggerHaptic = useHapticFeedback();

  /* ---- Extracted hooks ---- */

  const pantrySync = usePantrySync({
    pantrySummary,
    pantryNames,
    cookableRecipes,
    almostCookableRecipes,
  });

  const shopping = useShoppingList({
    refreshPantrySummary: pantrySync.refreshPantrySummary,
  });

  /* ---- Navigation state ---- */

  const [activeSection, setActiveSection] = useState<AppHomeSection>("home");
  const primaryActiveSection = getPrimaryAppHomeSection(activeSection);
  const activeHomeSection =
    activeSection === "home.shoppingList" ? "home.shoppingList" : "home.recipes";

  /* ---- Recipes state (owned here, passed to RecipesSection) ---- */

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [customRecipeState, setCustomRecipeState] =
    useState<CustomRecipeHeroSnapshot>({
      status: "idle",
      progress: 0,
      displayTip: "",
      result: null,
      error: null,
      userMessage: null,
      fallbackRecommendations: [],
    });
  const [pendingProfileRecipe, setPendingProfileRecipe] =
    useState<BasicHomeRecipePreview | null>(null);

  /* ---- Kitchen counter ---- */

  const [selectedKitchenCounter, setSelectedKitchenCounter] =
    useState<BasicHomeRecipePreview | null>(null);

  useEffect(() => {
    setSelectedKitchenCounter(readStoredKitchenCounterRecipe());
  }, []);

  const handleCookRecipe = useCallback((recipe: BasicHomeRecipePreview) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
        JSON.stringify(recipe),
      );
    }
    setSelectedKitchenCounter(recipe);
    setActiveSection("kitchenCounter");
  }, []);

  const handleKitchenCounterBack = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(
        KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
      );
    }
    setSelectedKitchenCounter(null);
    setActiveSection("home");
  }, []);

  const handleOpenBookmarkedRecipeFromProfile = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      triggerHaptic("medium");
      setPendingProfileRecipe(recipe);
      setActiveSection("home");
    },
    [triggerHaptic],
  );

  /* ---- Welcome dialog ---- */

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const currentVersion = APP_CONFIG.WELCOME_DIALOG_VERSION;
    const needsWelcome =
      !session.user.lastSeenWelcomeVersion ||
      session.user.lastSeenWelcomeVersion !== currentVersion;
    setShowWelcomeDialog(needsWelcome);
  }, [session?.user]);

  const handleCloseDialog = async () => {
    setShowWelcomeDialog(false);
    try {
      await fetch("/api/user/update-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: APP_CONFIG.WELCOME_DIALOG_VERSION }),
      });
    } catch (error) {
      logger.error("Failed to update welcome dialog version", error, {
        context: "HomePage",
        metadata: { userId: session?.user?.id },
      });
    }
  };

  /* ---- Section routing from URL ---- */

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const validSections = [
      "home",
      "home.recipes",
      "home.shoppingList",
      "pantry",
      "chatWithRivo",
      "profile",
      "kitchenCounter",
    ] as const;
    if (
      sectionParam &&
      validSections.includes(sectionParam as (typeof validSections)[number])
    ) {
      setActiveSection(sectionParam as (typeof validSections)[number]);
      const url = new URL(window.location.href);
      url.searchParams.delete("section");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const initialProfileViewParam = searchParams.get("profileView");
  const initialProfileView =
    initialProfileViewParam === "personal" ||
    initialProfileViewParam === "nutrition" ||
    initialProfileViewParam === "bookmarks" ||
    initialProfileViewParam === "billing"
      ? initialProfileViewParam
      : "default";

  /* ---- Section switcher callbacks ---- */

  const openPantrySection = useCallback(() => {
    triggerHaptic("light");
    setActiveSection("pantry");
  }, [triggerHaptic]);

  const handleHomeSectionChange = useCallback(
    (section: "home.recipes" | "home.shoppingList") => {
      triggerHaptic(activeHomeSection === section ? "light" : "medium");
      setActiveSection(section);
    },
    [activeHomeSection, triggerHaptic],
  );

  const handleCustomRecipeStateChange = useCallback(
    (nextState: CustomRecipeHeroSnapshot) => {
      setCustomRecipeState((current) =>
        current.status === nextState.status &&
        current.progress === nextState.progress &&
        current.displayTip === nextState.displayTip &&
        current.result === nextState.result &&
        current.error === nextState.error &&
        current.userMessage === nextState.userMessage &&
        current.fallbackRecommendations === nextState.fallbackRecommendations
          ? current
          : nextState,
      );
    },
    [],
  );

  /* ---- Render ---- */

  return (
    <div className="min-h-screen bg-eatrivo-white-primary flex">
      <TrackPageEvent
        eventName="home_viewed"
        metadata={{ locale, surface: "home" }}
      />
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={handleCloseDialog}
        version={APP_CONFIG.WELCOME_DIALOG_VERSION}
        changelog={
          APP_CONFIG.WELCOME_DIALOG_CHANGELOG[APP_CONFIG.WELCOME_DIALOG_VERSION]
        }
      />
      <HomeSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <HomeHeader />
      <AppShellViewport
        as="main"
        includeBottomNavOffset={
          primaryActiveSection !== "chatWithRivo" &&
          primaryActiveSection !== "profile" &&
          primaryActiveSection !== "kitchenCounter"
        }
        className={`flex-1 w-full md:max-w-[calc(100vw-256px)] h-[100dvh] ${
          primaryActiveSection === "chatWithRivo"
            ? "overflow-hidden p-0"
            : "overflow-x-hidden overflow-y-auto overscroll-y-contain pt-16 md:pt-8 px-4 md:px-8"
        }`}
      >
        <AnimatePresence mode="wait">
          {isHomeSection(activeSection) ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto space-y-6"
            >
              {/* ---- Section switcher ---- */}
              <div className="mb-6">
                <div className="mt-4 w-full rounded-2xl border border-eatrivo-black-primary/10 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="relative h-10 overflow-hidden rounded-xl px-4 text-sm font-semibold active:scale-[0.98]"
                      onClick={() => handleHomeSectionChange("home.recipes")}
                    >
                      {activeHomeSection === "home.recipes" ? (
                        <motion.span
                          layoutId="home-section-switch"
                          className="absolute inset-0 rounded-xl bg-eatrivo-purple shadow-[0_10px_30px_rgba(139,92,246,0.28)]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                            mass: 0.8,
                          }}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 transition-colors duration-300 ${
                          activeHomeSection === "home.recipes"
                            ? "text-white"
                            : "text-eatrivo-purple/75"
                        }`}
                      >
                        {t("greeting.actions.recipes")}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="relative h-10 overflow-hidden rounded-xl px-4 text-sm font-semibold active:scale-[0.98]"
                      onClick={() =>
                        handleHomeSectionChange("home.shoppingList")
                      }
                    >
                      {activeHomeSection === "home.shoppingList" ? (
                        <motion.span
                          layoutId="home-section-switch"
                          className="absolute inset-0 rounded-xl bg-eatrivo-purple shadow-[0_10px_30px_rgba(139,92,246,0.28)]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                            mass: 0.8,
                          }}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 transition-colors duration-300 ${
                          activeHomeSection === "home.shoppingList"
                            ? "text-white"
                            : "text-eatrivo-purple/75"
                        }`}
                      >
                        {t("greeting.actions.shoppingList")}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* ---- Content sections ---- */}
              <AnimatePresence mode="wait" initial={false}>
                {activeHomeSection === "home.shoppingList" ? (
                  <ShoppingListSection shopping={shopping} />
                ) : (
                  <RecipesSection
                    featuredRecipes={featuredRecipes}
                    livePantryNames={pantrySync.livePantryNames}
                    livePantrySummary={pantrySync.livePantrySummary}
                    liveCookableRecipes={pantrySync.liveCookableRecipes}
                    liveAlmostCookableRecipes={pantrySync.liveAlmostCookableRecipes}
                    customRecipeState={customRecipeState}
                    onCustomRecipeStateChange={handleCustomRecipeStateChange}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                    onOpenPantrySection={openPantrySection}
                    onAddToShoppingList={shopping.handleAddToShoppingList}
                    onCookRecipe={handleCookRecipe}
                    pendingExternalRecipe={pendingProfileRecipe}
                    onPendingExternalRecipeHandled={() => {
                      setPendingProfileRecipe(null);
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ) : primaryActiveSection === "pantry" ? (
            <motion.div
              key="pantry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <PantrySection
                onPantryChanged={pantrySync.refreshPantrySummary}
                initialData={initialPantryData}
              />
            </motion.div>
          ) : primaryActiveSection === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="-mx-4 md:-mx-8 md:-my-8"
            >
              <ProfilePageClient
                onBack={() => setActiveSection("home")}
                onOpenBookmarkedRecipe={handleOpenBookmarkedRecipeFromProfile}
                initialProfileData={initialProfileData}
                initialNutritionData={initialNutritionData}
                initialView={initialProfileView}
              />
            </motion.div>
          ) : primaryActiveSection === "chatWithRivo" ? (
            <motion.div
              key="chatWithRivo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ChatWithRivoPage />
            </motion.div>
          ) : primaryActiveSection === "kitchenCounter" ? (
            <motion.div
              key="kitchenCounter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full max-w-7xl mx-auto p-0 md:px-4 md:py-6"
            >
              <KitchenCounterPage
                recipe={selectedKitchenCounter}
                onBack={handleKitchenCounterBack}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AppShellViewport>
      <MobileNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <PWAInstallPrompt />
      <NotificationBanner />
      {isHomeSection(activeSection) && (
        <div className="hidden md:block">
          <FeedbackButton />
        </div>
      )}
    </div>
  );
}
