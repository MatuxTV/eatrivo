import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const messagesLoaders = {
  sk: () => import("../../../locales/sk.json").then((m) => m.default),
  en: () => import("../../../locales/en.json").then((m) => m.default),
} as const;

type LayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await messagesLoaders[locale]();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
