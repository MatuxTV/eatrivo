import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "../../../../auth";
import ChatWithRivoPage from "../chat-with-rivo/ChatWithRivoPage";
import { defaultLocale, isLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "dashboard.comingSoon",
  });
  const common = await getTranslations({
    locale: safeLocale,
    namespace: "common",
  });

  return {
    title: `${t("chatWithRivo.title")} - ${common("appName")}`,
    description: t("chatWithRivo.description"),
  };
}

export default async function ChatWithRivoPageWrapper({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}/signin`);
  }

  return <ChatWithRivoPage />;
}
