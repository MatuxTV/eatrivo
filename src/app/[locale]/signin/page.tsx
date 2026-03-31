import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { isLocale, type Locale } from "@/i18n/routing";
import { WelcomeAuthScreen } from "@/components/auth/WelcomeAuthScreen";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";

  const t = await getTranslations({ locale, namespace: "auth.welcome" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SignInPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";

  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return <WelcomeAuthScreen locale={locale} surface="signin_page" />;
}
