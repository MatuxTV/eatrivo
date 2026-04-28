"use client";

import { LayoutDashboard, Sparkles, LayoutDashboardIcon } from "lucide-react";
import { Link as NextLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function AdminHeader() {
  const t = useTranslations("emails.admin.dashboard.header");

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-eatrivo-purple/10 rounded-xl flex items-center justify-center text-eatrivo-purple">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                {t("title")}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                {t("description")}
              </p>
            </div>
          </div>
          <div>
            <NextLink href="/home">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-eatrivo-purple hover:bg-eatrivo-purple/10 rounded-full transition-colors" title={t("backHome")}>
                <LayoutDashboardIcon className="w-5 h-5" />
              </Button>
            </NextLink>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">{t("beta")}</span> {t("version")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
