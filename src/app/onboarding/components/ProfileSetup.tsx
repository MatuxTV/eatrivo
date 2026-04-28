"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  userProfileOnboardingSchema,
  type UserProfileOnboarding,
  type UserProfileOnboardingFormValues,
} from "@/lib/schemas/user";
import { trackClientEvent } from "@/lib/analytics/analytics-client";
import { motion } from "framer-motion";
import { User, Calendar, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface ProfileSetupProps {
  onComplete: (data: UserProfileOnboarding) => void;
  initialData?: UserProfileOnboarding | null;
}

export default function ProfileSetup({
  onComplete,
  initialData,
}: ProfileSetupProps) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const language: UserProfileOnboarding["language"] = locale === "en" ? "en" : "sk";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserProfileOnboardingFormValues>({
    resolver: zodResolver(userProfileOnboardingSchema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      dateOfBirth: initialData?.dateOfBirth || "",
      language: language,
    },
  });

  useEffect(() => {
    form.setValue("language", language, { shouldValidate: true });
  }, [form, language]);

  useEffect(() => {
    trackClientEvent({
      eventName: "onboarding_step_viewed",
      metadata: {
        locale,
        step_name: "profile",
        step_index: 1,
      },
    });
  }, [locale]);

  const onSubmit = async (data: UserProfileOnboardingFormValues) => {
    setIsSubmitting(true);
    try {
      // Complete onboarding
      const parsed: UserProfileOnboarding = userProfileOnboardingSchema.parse({
        ...data,
        language,
      });
      onComplete(parsed);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error("Error submitting profile", error, {
        context: "ProfileSetup",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="w-16 h-16 bg-eatrivo-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-eatrivo-purple">
            <User className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t("profile.title")}
          </CardTitle>
          <CardDescription className="text-base text-gray-500 max-w-md mx-auto">
            {t("profile.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <input type="hidden" {...form.register("language")} value={language} readOnly />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-eatrivo-purple" />
                      {t("profile.fullName")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white border-gray-200 focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 h-12 rounded-xl"
                        placeholder={t("profile.fullNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-eatrivo-purple" />
                      {t("profile.dateOfBirth")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white border-gray-200 focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 h-12 rounded-xl"
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-eatrivo-purple hover:bg-eatrivo-purple/90 rounded-xl shadow-lg shadow-eatrivo-purple/20 hover:shadow-eatrivo-purple/40 transition-all duration-300 mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  t("profile.saving")
                ) : (
                  <span className="flex items-center">
                    {t("profile.continue")} <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
