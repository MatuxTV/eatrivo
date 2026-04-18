import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "../../../auth";
import PantryPage from "@/app/pantry/components/PantryPage";
import { isLocale, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "sk";

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "pantry",
  });
  const common = await getTranslations({
    locale: safeLocale,
    namespace: "common",
  });

  return {
    title: `${t("metadata.title")} - ${common("appName")}`,
    description: t("metadata.description"),
  };
}

export default async function PantryPageCanonical() {
  const locale = await getLocale();
  const safeLocale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}`);
  }

  return <PantryPage />;
}
