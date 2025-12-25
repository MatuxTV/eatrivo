"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, User, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

type PersonalInfoFormData = {
  fullName: string;
  dateOfBirth: string;
};

interface PersonalInfoSectionProps {
  profileData: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    membership: string;
  } | null;
  isLoading: boolean;
  onUpdate: (data: { fullName: string; dateOfBirth: string; email: string; membership: string }) => void;
}

export default function PersonalInfoSection({
  profileData,
  isLoading,
  onUpdate,
}: PersonalInfoSectionProps) {
  const t = useTranslations("profile");
  const [isSaving, setIsSaving] = useState(false);

  const personalInfoSchema = useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .min(2, t("personal.validation.fullNameMin")),
        dateOfBirth: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, t("personal.validation.dateFormat")),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    if (profileData) {
      reset({
        fullName: profileData.fullName,
        dateOfBirth: profileData.dateOfBirth,
      });
    }
  }, [profileData, reset]);

  const onSubmit = async (data: PersonalInfoFormData) => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const result = await response.json();
      onUpdate(result.profile);
      reset(data); // Reset form to mark as not dirty
      toast.success(t("personal.toast.updated"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("personal.toast.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-8 bg-eatrivo-white">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("personal.title")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("personal.description")}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-eatrivo-purple" />
              {t("personal.fields.fullName.label")}
            </Label>
            <Input
              id="fullName"
              {...register("fullName")}
              placeholder={t("personal.fields.fullName.placeholder")}
              defaultValue={profileData?.fullName || ""}
              className={errors.fullName ? "border-red-500" : ""}
            />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-eatrivo-purple" />
              {t("personal.fields.dateOfBirth.label")}
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register("dateOfBirth")}
              defaultValue={profileData?.dateOfBirth || ""}
              className={errors.dateOfBirth ? "border-red-500" : ""}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-eatrivo-purple" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={profileData?.email || ""}
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">
              {t("personal.fields.email.helper")}
            </p>
          </div>

          {/* Membership Badge */}
          <div className="p-4 bg-gradient-to-br from-eatrivo-purple/5 to-eatrivo-pink/5 rounded-xl border border-eatrivo-purple/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t("personal.membership.label")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("personal.membership.helper")}</p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink text-white font-bold text-sm rounded-lg">
                {profileData?.membership || "FREE"}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isDirty || isSaving}
            className="w-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90 transition-opacity"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("personal.actions.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t("personal.actions.save")}
              </>
            )}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
