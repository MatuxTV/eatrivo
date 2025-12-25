import { auth } from "../../../../auth";
import { redirect } from "next/navigation";

import { checkUserProfileExists } from "@/lib/user-utils";
import OnboardingClient from "@/app/onboarding/components/OnBoardingPage";
import { isLocale, type Locale } from "@/i18n/routing";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";

  const t = await getTranslations({ locale, namespace: "onboarding" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return {
    title: `${t("metadata.title")} | ${tCommon("appName")}`,
    description: t("metadata.description"),
  };
}

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/signin`);
  }

  const existingProfile = await checkUserProfileExists(session.user.id);
  if (existingProfile) {
    redirect(`/${locale}/dashboard`);
  }

  return <OnboardingClient userEmail={session.user.email || undefined} />;
}
