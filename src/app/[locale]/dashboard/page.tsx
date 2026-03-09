import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const query = await searchParams;
  const nextSearch = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextSearch.append(key, entry));
    } else if (typeof value === "string") {
      nextSearch.set(key, value);
    }
  }

  const suffix = nextSearch.toString();
  redirect(`/${safeLocale}/home${suffix ? `?${suffix}` : ""}`);
}