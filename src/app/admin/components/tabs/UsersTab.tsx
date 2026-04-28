"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { User as UserType } from "../types";

interface UsersTabProps {
  users: UserType[];
  isLoadingUsers: boolean;
  onSelectUser: (userId: string, userName: string) => void;
}

export default function UsersTab({
  users,
  isLoadingUsers,
  onSelectUser,
}: UsersTabProps) {
  const t = useTranslations("emails.admin.dashboard.usersTab");
  const tCommon = useTranslations("emails.admin.dashboard.common");

  return (
    <Card className="border-none shadow-lg bg-eatrivo-light">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          {t("title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-eatrivo-purple/30 border-t-eatrivo-purple rounded-full animate-spin" />
              <p className="text-xs sm:text-sm text-gray-500">
                {t("loading")}
              </p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              {t("emptyTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="group p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-eatrivo-purple/30 hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0">
                    {user.fullName?.[0] || user.email[0].toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {user.fullName || tCommon("noName")}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {user.membership === "premium" && (
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                        )}
                        {user.membership === "premium" && (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-yellow-200 text-eatrivo-black-secondary font-semibold rounded-full capitalize">
                            {tCommon("membership.plus")}
                          </span>
                        )}
                        {user.membership === "trainer" && (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-eatrivo-green font-semibold rounded-full capitalize">
                            {tCommon("membership.trainer")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="hidden xs:grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-gray-500">{t("details.id")}</span>
                        <span className="font-mono text-gray-700 truncate">
                          {user.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-gray-500">{t("details.profile")}</span>
                        <span className="px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium">
                          {user.isProfileComplete ? tCommon("profile.complete") : tCommon("profile.incomplete")}
                        </span>
                      </div>
                      {user.username && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs col-span-2">
                          <span className="text-gray-500">{t("details.username")}</span>
                          <span className="text-gray-700">
                            @{user.username}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 hover:bg-eatrivo-purple hover:text-white hover:border-eatrivo-purple transition-colors"
                        onClick={() => {
                          if (user.profileId) {
                            onSelectUser(
                              user.profileId,
                              user.fullName || user.email,
                            );
                          }
                        }}
                      >
                        <Plus className="w-3 h-3 mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">{t("actions.create")}</span>{" "}
                        {t("actions.list")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-eatrivo-white-primary text-eatrivo-purple border-2 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                        onClick={() => {
                          navigator.clipboard.writeText(user.email);
                          toast.success(t("actions.emailCopied"));
                        }}
                      >
                        <span className="hidden sm:inline">{t("actions.copy")}</span>{" "}
                        {t("actions.email")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
