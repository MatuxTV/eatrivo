"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function OfflinePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = useTranslations("offline");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-eatrivo-white-primary to-white p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-eatrivo-purple/10 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-eatrivo-purple" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-eatrivo-black-primary">
            {t("title")}
          </h1>
          <p className="text-gray-600">{t("description")}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h2 className="font-semibold text-lg mb-3 text-eatrivo-black-primary">
            {t("whatYouCanDo")}
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>{t("features.viewShoppingList")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>{t("features.viewCachedData")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>{t("features.noNewPlans")}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90"
          >
            {t("tryAgain")}
          </Button>

          <Link href={`/${locale}/home`}>
            <Button variant="outline" className="w-full">
              {t("goToHome")}
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-500">{t("autoRefresh")}</p>
      </div>
    </div>
  );
}
