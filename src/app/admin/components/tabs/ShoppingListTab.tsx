"use client";

import React from "react";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileText,
  LayoutDashboard,
  User,
  Search,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type {
  User as UserType,
  UserInfo,
  ShoppingListFormData,
} from "../types";
import StatsCard from "../shared/StatsCard";
import UserInfoCard from "../shared/UserInfoCard";

// Import editor styles
import 'react-markdown-editor-lite/lib/index.css';

// Dynamic import for MdEditor to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Initialize markdown parser
const mdParser = new MarkdownIt();

interface ShoppingListTabProps {
  formData: ShoppingListFormData;
  users: UserType[];
  isLoadingUsers: boolean;
  userInfo: UserInfo | null;
  isLoadingUserInfo: boolean;
  isUploading: boolean;
  isGeneratingAI: boolean;
  onInputChange: (field: keyof ShoppingListFormData, value: string) => void;
  onMarkdownChange: ({ text }: { text: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGenerateWithAI: () => Promise<void>;
}

export default function ShoppingListTab({
  formData,
  users,
  isLoadingUsers,
  userInfo,
  isLoadingUserInfo,
  isUploading,
  isGeneratingAI,
  onInputChange,
  onMarkdownChange,
  onSubmit,
  onGenerateWithAI,
}: ShoppingListTabProps) {
  const t = useTranslations("admin.dashboard.shoppingListTab");
  const tCommon = useTranslations("admin.dashboard.common");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left Column - Form */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {t("title")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                  <FileText className="w-4 h-4 text-eatrivo-purple" />
                  {t("sections.basicInfo")}
                </h3>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="title" className="mb-1.5 block">
                      {t("fields.title.label")}
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => onInputChange("title", e.target.value)}
                      placeholder={t("fields.title.placeholder")}
                      required
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-1.5 block">
                      {t("fields.description.label")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        onInputChange("description", e.target.value)
                      }
                      placeholder={t("fields.description.placeholder")}
                      rows={2}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Timing Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                  <LayoutDashboard className="w-4 h-4 text-eatrivo-purple" />
                  {t("sections.planning")}
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label
                      htmlFor="startDate"
                      className="mb-1.5 block text-xs sm:text-sm"
                    >
                      {t("fields.startDate")}
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.weekStartDate}
                      onChange={(e) =>
                        onInputChange("weekStartDate", e.target.value)
                      }
                      required
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="endDate"
                      className="mb-1.5 block text-xs sm:text-sm"
                    >
                      {t("fields.endDate")}
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.weekEndDate}
                      onChange={(e) =>
                        onInputChange("weekEndDate", e.target.value)
                      }
                      required
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-eatrivo-purple" />
                  {t("sections.assignment")}
                </h3>

                <div>
                  <Label className="mb-1.5 block">{t("fields.user")}</Label>
                  {isLoadingUsers ? (
                    <div className="flex items-center gap-3 p-4 text-sm text-gray-500 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-eatrivo-purple"></div>
                      {t("loadingUsers")}
                    </div>
                  ) : (
                    <Select
                      value={formData.userId || ""}
                      onValueChange={(value: string) =>
                        onInputChange("userId", value)
                      }
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={t("fields.userPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 sticky top-0 bg-white z-10 border-b border-gray-100 mb-1">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              className="w-full pl-8 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-eatrivo-purple"
                              placeholder={t("fields.searchPlaceholder")}
                            />
                          </div>
                        </div>
                        <SelectItem value="0" className="py-3">
                          <div className="flex items-center gap-2 text-gray-500">
                            <User className="w-4 h-4" />
                            <span>{t("fields.unassignedTest")}</span>
                          </div>
                        </SelectItem>
                        {users.map((user) => (
                          <SelectItem
                            key={user.id}
                            value={user.profileId || user.id}
                            className="py-2"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                ${
                                  user.membership === "Premium" || user.membership === "Plus"
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : user.membership === "Basic"
                                      ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                      : "bg-gray-400"
                                }`}
                              >
                                {user.fullName?.[0] ||
                                  user.email[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-gray-900">
                                  {user.fullName || tCommon("noName")}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {user.email}
                                </span>
                              </div>
                              {(user.membership === "Premium" || user.membership === "Plus") && (
                                <Sparkles className="w-3 h-3 text-yellow-500 ml-auto" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* User Info Card - Compact */}
                {formData.userId && formData.userId !== "0" && (
                  <UserInfoCard
                    userInfo={userInfo}
                    isLoading={isLoadingUserInfo}
                  />
                )}

                <div>
                  <Label htmlFor="status" className="mb-1.5 block">
                    {t("fields.status.label")}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(
                      value: "active" | "completed" | "cancelled",
                    ) => onInputChange("status", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("fields.status.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {tCommon("status.active")}
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {tCommon("status.completed")}
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          {tCommon("status.cancelled")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Editor Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-eatrivo-purple" />
                    {t("sections.content")}
                  </h3>
                  <Button
                    type="button"
                    onClick={onGenerateWithAI}
                    disabled={
                      isGeneratingAI ||
                      !formData.userId ||
                      formData.userId === "0"
                    }
                    className="h-8 sm:h-9 px-3 sm:px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {isGeneratingAI ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("actions.generatingAi")}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {t("actions.generateAi")}
                      </div>
                    )}
                  </Button>
                </div>
                <div className="border text-eatrivo-black-primary border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-eatrivo-purple/20 focus-within:border-eatrivo-purple transition-all">
                  <MdEditor
                    value={formData.markdownContent}
                    style={{ height: "500px" }}
                    renderHTML={(text) => mdParser.render(text)}
                    onChange={onMarkdownChange}
                    placeholder={t("fields.markdownPlaceholder")}
                    className="md-editor-mobile"
                  />
                </div>
              </div>

              <div className="pt-2 sm:pt-4">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:from-eatrivo-purple/90 hover:to-eatrivo-pink/90 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg shadow-eatrivo-purple/20 hover:shadow-eatrivo-purple/40 transition-all duration-300"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("actions.creating")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline">
                        {t("actions.createList")}
                      </span>
                      <span className="sm:hidden">{t("actions.createListShort")}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Stats/Info */}
      <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
        <StatsCard users={users} />

        <Card className="border-none shadow-md bg-white hidden sm:block">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-base text-eatrivo-black-primary">
              {t("tips.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-500">
            <div className="flex gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500 text-xs sm:text-sm">
                1
              </div>
              <p>
                {t.rich("tips.markdown", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500 text-xs sm:text-sm">
                2
              </div>
              <p>{t("tips.assignment")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
