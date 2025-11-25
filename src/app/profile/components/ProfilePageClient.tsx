"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Settings, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PersonalInfoSection from "./PersonalInfoSection";
import NutritionPreferencesSection from "./NutritionPreferencesSection";
import Link from "next/link";

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
  activity_level: string;
  goal: string;
  meal_per_day: number | null;
  cooking_time_pref: string | null;
  diet_preferences: string | null;
  budget_preference: string | null;
  likes: string | null;
  dislikes: string | null;
  allergies: string | null;
}

export default function ProfilePageClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"personal" | "nutrition">("personal");
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [nutritionData, setNutritionData] = useState<UserNutritionData | null>(null);

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
        toast.error("Nepodarilo sa načítať profil");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const tabs = [
    { id: "personal", label: "Osobné údaje", icon: User },
    { id: "nutrition", label: "Nutričné preferencie", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Môj profil</h1>
                <p className="text-xs text-gray-500">
                  Spravujte svoje osobné údaje a preferencie
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink rounded-full flex items-center justify-center text-white font-bold text-sm">
                {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>
      </div>

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
