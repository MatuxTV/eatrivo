import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "../../../../auth";
import ProfilePageClient from "@/app/profile/components/ProfilePageClient";
import { defaultLocale, isLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const t = await getTranslations({ locale: safeLocale, namespace: "profile" });
  const common = await getTranslations({ locale: safeLocale, namespace: "common" });

  return {
    title: `${t("metadata.title")} - ${common("appName")}`,
    description: t("metadata.description"),
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}/signin`);
  }

  return <ProfilePageClient />;
}
