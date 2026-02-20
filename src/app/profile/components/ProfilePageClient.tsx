"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PersonalInfoSection from "./PersonalInfoSection";
import NutritionPreferencesSection from "./NutritionPreferencesSection";
import { useTranslations } from "next-intl";

interface UserProfileData {
  fullName: string;
  email: string;
  dateOfBirth: string;
  membership: string;
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
}

export default function ProfilePageClient({ onBack }: ProfilePageClientProps) {
  const t = useTranslations("profile");
  const [activeTab, setActiveTab] = useState<"personal" | "nutrition">(
    "personal",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [nutritionData, setNutritionData] = useState<UserNutritionData | null>(
    null,
  );

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        // Fetch user profile and nutrition data
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

  const tabs = [
    { id: "personal", label: t("tabs.personal"), icon: User },
    { id: "nutrition", label: t("tabs.nutrition"), icon: Settings },
  ] as const;

  return (
    <div className="bg-eatrivo-white-primary h-full">
      <div className="max-w-5xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-eatrivo-purple bg-eatrivo-purple/5"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeProfileTab"
                    className="absolute inset-0 border-2 border-eatrivo-purple/20 rounded-lg"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "personal" && (
            <PersonalInfoSection
              key="personal"
              profileData={profileData}
              isLoading={isLoading}
              onUpdate={(data) => setProfileData(data)}
            />
          )}
          {activeTab === "nutrition" && (
            <NutritionPreferencesSection
              key="nutrition"
              nutritionData={nutritionData}
              isLoading={isLoading}
              onUpdate={(data) => setNutritionData(data)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
