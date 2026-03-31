"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  User,
  UserCircle,
  Calendar,
  Activity,
  Scale,
  Target,
  Heart,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import type {
  User as UserType,
  UserInfo,
} from "../types";

interface ProfilesTabProps {
  users: UserType[];
  selectedUserForProfile: string;
  onUserChange: (userId: string) => void;
  userInfo: UserInfo | null;
  isLoadingUserInfo: boolean;
}

export default function ProfilesTab({
  users,
  selectedUserForProfile,
  onUserChange,
  userInfo,
  isLoadingUserInfo,
}: ProfilesTabProps) {
  const t = useTranslations("admin.dashboard.profilesTab");
  const tCommon = useTranslations("admin.dashboard.common");

  const getMembershipLabel = (membership?: string | null) => {
    const normalizedMembership = membership?.toLowerCase();

    if (normalizedMembership === "premium") {
      return tCommon("membership.plus");
    }

    if (normalizedMembership === "trainer") {
      return tCommon("membership.trainer");
    }

    return tCommon("membership.basic");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left Column - User Selection */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {t("title")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="profileUser"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  {t("selectUser")}
                </Label>
                <Select
                  value={selectedUserForProfile}
                  onValueChange={onUserChange}
                >
                  <SelectTrigger className="h-11 border-gray-200 focus:ring-eatrivo-purple focus:border-eatrivo-purple">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("selectOption")}</SelectItem>
                    {users
                      .filter((user) => user.profileId)
                      .sort((a, b) =>
                        (a.fullName || a.name || "").localeCompare(
                          b.fullName || b.name || "",
                        ),
                      )
                      .map((user) => (
                        <SelectItem
                          key={user.id}
                          value={user.profileId || user.id}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.fullName || user.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.email}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium">
                              {getMembershipLabel(user.membership)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loading State */}
              {isLoadingUserInfo && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-eatrivo-purple/30 border-t-eatrivo-purple rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">{t("loading")}</p>
                  </div>
                </div>
              )}

              {/* No User Selected */}
              {!selectedUserForProfile && !isLoadingUserInfo && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <UserCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t("emptySelection.title")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("emptySelection.description")}
                  </p>
                </div>
              )}

              {/* User Info Display */}
              {selectedUserForProfile && !isLoadingUserInfo && userInfo && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-eatrivo-purple" />
                      {t("sections.basicInfo")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            {t("fields.sex")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.sex === "man"
                            ? tCommon("sex.man")
                            : userInfo.sex === "woman"
                              ? tCommon("sex.woman")
                              : t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            {t("fields.age")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.dateOfBirth
                            ? `${(() => {
                                const birthDate = new Date(
                                  userInfo.dateOfBirth!,
                                );
                                const today = new Date();
                                let age =
                                  today.getFullYear() - birthDate.getFullYear();
                                const m =
                                  today.getMonth() - birthDate.getMonth();
                                if (
                                  m < 0 ||
                                  (m === 0 &&
                                    today.getDate() < birthDate.getDate())
                                ) {
                                  age--;
                                }
                                return age;
                              })()} ${t("yearsSuffix")}`
                            : t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            {t("fields.height")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.height
                            ? `${userInfo.height} cm`
                            : t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            {t("fields.weight")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.weight
                            ? `${userInfo.weight} kg`
                            : t("notSpecified")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fitness Goals */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-eatrivo-purple" />
                      {t("sections.goals")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <p className="text-xs font-medium text-blue-700">
                            {t("fields.goal")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.goal || t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-green-500" />
                          <p className="text-xs font-medium text-green-700">
                            {t("fields.activityLevel")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.activity_level?.replace(/_/g, " ") ||
                            t("notSpecified")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Diet Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-eatrivo-purple" />
                      {t("sections.preferences")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-purple-500" />
                          <p className="text-xs font-medium text-purple-700">
                            {t("fields.diet")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.diet_preferences || t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <p className="text-xs font-medium text-orange-700">
                            {t("fields.cookingTime")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.cooking_time_pref || t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-pink-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-pink-500" />
                          <p className="text-xs font-medium text-pink-700">
                            {t("fields.budget")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.budget_preference || t("notSpecified")}
                        </p>
                      </div>
                      <div className="p-4 bg-cyan-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-cyan-500" />
                          <p className="text-xs font-medium text-cyan-700">
                            {t("fields.mealsPerDay")}
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.meal_per_day || t("notSpecified")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preferences Details */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-eatrivo-purple" />
                      {t("sections.foodPreferences")}
                    </h3>
                    <div className="space-y-3">
                      {userInfo.likes && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-semibold text-green-900">
                              {t("fields.likes")}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.likes}
                          </p>
                        </div>
                      )}
                      {userInfo.dislikes && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-900">
                              {t("fields.dislikes")}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.dislikes}
                          </p>
                        </div>
                      )}
                      {userInfo.allergies && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm font-semibold text-yellow-900">
                              {t("fields.allergies")}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.allergies}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* No User Info Available */}
              {selectedUserForProfile && !isLoadingUserInfo && !userInfo && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t("noData.title")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("noData.description")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Stats */}
      <div className="space-y-4 sm:space-y-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              {t("stats.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <div className="space-y-3 relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {users.filter((u) => u.isProfileComplete).length}
                  </p>
                  <p className="text-xs text-white/80">{t("stats.completedProfiles")}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {users.length > 0
                      ? Math.round(
                          (users.filter((u) => u.isProfileComplete).length /
                            users.length) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-white/80">{t("stats.successRate")}</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{
                    width: `${users.length > 0 ? Math.round((users.filter((u) => u.isProfileComplete).length / users.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
