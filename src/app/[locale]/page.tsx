import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/routing";
import { auth } from "@/../auth";
import LandingPage from "@/components/marketing/LandingPage";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: { languages: { sk: "/sk", en: "/en" } },
    openGraph: {
      title,
      description,
      images: ["/images/landing/hero-counter.webp"],
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";
  const session = await auth();

  if (session?.user) {
    redirect("/home");
  }

  return <LandingPage locale={locale} />;
}
