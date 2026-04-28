import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { userInfoTable, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

import AdminDashboard from "@/app/admin/components/AdminDashboard";
import { isLocale, type Locale } from "@/i18n/routing";

const adminMessagesLoaders = {
  sk: () => import("../../../locales/sk.json").then((m) => m.default),
  en: () => import("../../../locales/en.json").then((m) => m.default),
} as const;

async function resolveAdminLocale(
  userId?: string | null,
  preferredLocale?: string | null,
): Promise<Locale> {
  if (!userId) {
    return "sk";
  }

  if (isLocale(preferredLocale)) {
    return preferredLocale;
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { id: true },
  });

  if (!userProfile) {
    return "sk";
  }

  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfile.id),
    columns: { language: true },
  });

  return isLocale(userInfo?.language) ? userInfo.language : "sk";
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  const safeLocale = await resolveAdminLocale(
    session?.user?.id,
    session?.user?.locale,
  );

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "emails.admin.dashboard.metadata",
  });
  const common = await getTranslations({
    locale: safeLocale,
    namespace: "common",
  });

  return {
    title: `${t("title")} - ${common("appName")}`,
    description: t("description"),
  };
}

export default async function AdminPage() {
  const session = await auth();
  const safeLocale = await resolveAdminLocale(
    session?.user?.id,
    session?.user?.locale,
  );

  if (!session?.user?.id) {
    redirect(`/${safeLocale}`);
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  if (!userProfile || userProfile.role !== "admin") {
    redirect(`/${safeLocale}/not-authorized`);
  }

  const messages = await adminMessagesLoaders[safeLocale]();

  return (
    <NextIntlClientProvider locale={safeLocale} messages={messages}>
      <AdminDashboard />
    </NextIntlClientProvider>
  );
}