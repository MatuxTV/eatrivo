"use client";

import { useState } from "react";
import ProfileSetup from "./ProfileSetup";
import FoodPreferences from "./FoodPreferences";
import type { UserProfileOnboarding, UserFoodPreferences } from "../../../lib/schemas/user";
import type { OnboardingConsents } from "./FoodPreferences";
import { logger } from "@/lib/logger";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface OnboardingClientProps {
  userEmail?: string;
}

export default function OnboardingClient({ userEmail }: OnboardingClientProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<UserProfileOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileComplete = (data: UserProfileOnboarding) => {
    setProfileData(data);
    setCurrentStep(2);
  };

  const handleFoodPreferencesComplete = async (data: UserFoodPreferences, consents: OnboardingConsents) => {
    setIsLoading(true);
    
    try {
      // Save both profile and food preferences to database
      const response = await fetch("/api/onboarding/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: profileData,
          foodPreferences: data,
          consents: {
            termsAndPrivacy: consents.termsAndPrivacy,
            medicalDisclaimer: consents.medicalDisclaimer,
            healthDataProcessing: consents.healthDataProcessing,
          },
        }),
      });

      if (response.ok) {
        // Send welcome email after successful onboarding (non-blocking)
        if (userEmail && profileData?.fullName) {
          try {
            await fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "welcome",
                to: userEmail,
                userName: profileData.fullName,
              }),
            });
            logger.info(`Welcome email sent successfully to ${userEmail}`, {
              context: "OnBoardingPage",
            });
          } catch (emailError) {
            logger.error(`Failed to send welcome email to ${userEmail}`, emailError, {
              context: "OnBoardingPage",
            });
            // Don't block dashboard redirect if email fails
          }
        } else {
          logger.warn("User email or name not available for welcome email", {
            context: "OnBoardingPage",
          });
        }

        // Redirect to home
        router.push("/home");
      } else {
        throw new Error("Failed to save onboarding data");
      }
    } catch (error) {
      logger.error("Error saving onboarding", error, {
        context: "OnBoardingPage"
      });
      alert(t("errors.saveFailed"));
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
    <div className="min-h-screen bg-eatrivo-white-primary flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-4 md:py-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            {t("title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t("stepCounter", { current: currentStep, total: 2 })}
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
                  {t("steps.profile")}
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
                  {t("steps.preferences")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 md:px-4 py-4 md:py-8">
        {currentStep === 1 && (
          <ProfileSetup 
            onComplete={handleProfileComplete} 
            initialData={profileData}
          />
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
