"use client";

import { useState } from "react";
import ProfileSetup from "./ProfileSetup";
import FoodPreferences from "./FoodPreferences";
import type { UserProfileOnboarding, UserFoodPreferences } from "../../../lib/schemas/user";
import { logger } from "@/lib/logger";

export default function OnboardingClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<UserProfileOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileComplete = (data: UserProfileOnboarding) => {
    setProfileData(data);
    setCurrentStep(2);
  };

  const handleFoodPreferencesComplete = async (data: UserFoodPreferences) => {
    setIsLoading(true);
    
    try {
      // Here you'll save both profile and food preferences to database
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: profileData,
          foodPreferences: data,
        }),
      });

      if (response.ok) {
        // Redirect to dashboard or success page
        window.location.href = "/dashboard";
      } else {
        throw new Error("Failed to save onboarding data");
      }
    } catch (error) {
      logger.error("Error saving onboarding", error, {
        context: "OnBoardingPage"
      });
      alert("Chyba pri ukladaní údajov. Skúste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-4 md:py-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Nastavenie profilu
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Krok {currentStep} z 2
          </p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-medium ${
                    currentStep >= 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  1
                </div>
                <span className="ml-1 md:ml-2 text-xs md:text-sm font-medium text-gray-900">
                  Osobné údaje
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <div
                  className={`w-full h-1 mx-2 md:mx-4 rounded ${
                    currentStep >= 2 ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-medium ${
                    currentStep >= 2
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-1 md:ml-2 text-xs md:text-sm font-medium text-gray-900">
                  Jedálne preferencie
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 md:px-4 py-4 md:py-8">
        {currentStep === 1 && (
          <ProfileSetup onComplete={handleProfileComplete} initialData={profileData} />
        )}
        
        {currentStep === 2 && (
          <FoodPreferences
            onComplete={handleFoodPreferencesComplete}
            onPrevious={handlePrevious}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
