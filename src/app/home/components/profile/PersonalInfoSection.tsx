"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, User, Mail, Calendar, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { UserBadge } from "@/components/ui/UserBadge";

type PersonalInfoFormData = {
  fullName: string;
  dateOfBirth: string;
  isEmailSubscriptionActive: boolean;
};

interface PersonalInfoSectionProps {
  profileData: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    membership: string;
    badges?: string[];
    isEmailSubscriptionActive: boolean;
  } | null;
  isLoading: boolean;
  onUpdate: (data: {
    fullName: string;
    dateOfBirth: string;
    email: string;
    membership: string;
    badges?: string[];
    isEmailSubscriptionActive: boolean;
  }) => void;
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
        fullName: z.string().min(2, t("personal.validation.fullNameMin")),
        dateOfBirth: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, t("personal.validation.dateFormat")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      isEmailSubscriptionActive: true,
    },
  });

  const isEmailSubscriptionActive = watch("isEmailSubscriptionActive");

  useEffect(() => {
    if (profileData) {
      reset({
        fullName: profileData.fullName,
        dateOfBirth: profileData.dateOfBirth,
        isEmailSubscriptionActive: profileData.isEmailSubscriptionActive,
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
      reset(data);
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
      <div>
        <Card className="rounded-[1.8rem] border-[#efe2fb] bg-white p-8 shadow-[0_18px_40px_rgba(121,78,171,0.08)]">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="overflow-hidden rounded-[1.8rem] border-[#efe2fb] bg-white p-4 shadow-[0_18px_40px_rgba(121,78,171,0.08)] sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-[-0.04em] text-[#35204f] sm:text-2xl">
                  {t("personal.title")}
                </h2>
                {profileData?.badges?.map((badgeStr) => (
                  <UserBadge key={badgeStr} type={badgeStr} />
                ))}
              </div>
              <p className="text-sm font-medium text-[#87739f]">{t("personal.description")}</p>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#fdf8ff_0%,#f7eeff_100%)] p-4 ring-1 ring-[#eedfff] sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#7d49cf] ring-1 ring-[#eadcff]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b84b6]">
                        {t("personal.fields.fullName.label")}
                      </p>
                      <p className="text-lg font-black tracking-[-0.04em] text-[#35204f]">
                        {profileData?.fullName || t("header.fallbackName")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="flex items-center gap-2 text-sm font-semibold text-[#584a6a]"
                    >
                      <User className="w-4 h-4 text-eatrivo-purple" />
                      {t("personal.fields.fullName.label")}
                    </Label>
                    <Input
                      id="fullName"
                      {...register("fullName")}
                      placeholder={t("personal.fields.fullName.placeholder")}
                      defaultValue={profileData?.fullName || ""}
                      autoComplete="name"
                      className={`h-12 rounded-2xl border-[#e8d9fb] bg-white text-base sm:text-sm ${errors.fullName ? "border-red-500" : ""}`}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-500">{errors.fullName.message}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-[#efe3fb] sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#faf3ff] text-[#7d49cf] ring-1 ring-[#eadcff]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b84b6]">
                        {t("personal.fields.dateOfBirth.label")}
                      </p>
                      <p className="text-lg font-black tracking-[-0.04em] text-[#35204f]">
                        {profileData?.dateOfBirth || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dateOfBirth"
                      className="flex items-center gap-2 text-sm font-semibold text-[#584a6a]"
                    >
                      <Calendar className="w-4 h-4 text-eatrivo-purple" />
                      {t("personal.fields.dateOfBirth.label")}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      defaultValue={profileData?.dateOfBirth || ""}
                      autoComplete="bday"
                      className={`h-12 rounded-2xl border-[#e8d9fb] bg-white text-base sm:text-sm ${errors.dateOfBirth ? "border-red-500" : ""}`}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-sm text-red-500">
                        {errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-[#efe3fb] sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#faf3ff] text-[#7d49cf] ring-1 ring-[#eadcff]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b84b6]">
                      Email
                    </p>
                    <p className="break-all text-sm font-semibold text-[#35204f]">
                      {profileData?.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center gap-2 text-sm font-semibold text-[#584a6a]"
                  >
                    <Mail className="w-4 h-4 text-eatrivo-purple" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData?.email || ""}
                    disabled
                    autoComplete="email"
                    className="h-12 cursor-not-allowed rounded-2xl border-[#eee4fa] bg-[#faf7fe] text-base sm:text-sm"
                  />
                  <p className="text-xs text-[#8a78a2]">
                    {t("personal.fields.email.helper")}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#fff8ff_0%,#f6f0ff_100%)] p-4 ring-1 ring-[#eadcff] sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#7d49cf] ring-1 ring-[#eadcff]">
                    <MailCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b84b6]">
                      {t("personal.fields.emailSubscription.label")}
                    </p>
                    <p className="text-sm font-semibold text-[#35204f]">
                      {isEmailSubscriptionActive
                        ? t("personal.fields.emailSubscription.status.enabled")
                        : t("personal.fields.emailSubscription.status.disabled")}
                    </p>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.25rem] border border-[#eadcff] bg-white/90 p-4 transition-colors hover:bg-white">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#584a6a]">
                      {t("personal.fields.emailSubscription.toggleTitle")}
                    </p>
                    <p className="text-xs leading-5 text-[#8a78a2]">
                      {t("personal.fields.emailSubscription.helper")}
                    </p>
                  </div>
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...register("isEmailSubscriptionActive")}
                    />
                    <span className="h-7 w-12 rounded-full bg-[#e8d9fb] transition-colors peer-checked:bg-[#7d49cf]" />
                    <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>
            </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!isDirty || isSaving}
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink text-base shadow-[0_14px_28px_rgba(125,73,207,0.25)] transition-opacity hover:opacity-90 sm:text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("personal.actions.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("personal.actions.save")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}