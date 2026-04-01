import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/../auth";
import { isLocale } from "@/i18n/routing";

interface BillingPageProps {
  searchParams?: Promise<{
    canceled?: string;
    success?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const locale = await getLocale();
  const safeLocale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${safeLocale}`);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParams = new URLSearchParams({
    section: "profile",
    profileView: "billing",
  });

  if (resolvedSearchParams?.canceled === "true") {
    nextParams.set("canceled", "true");
  }

  if (resolvedSearchParams?.success === "true") {
    nextParams.set("success", "true");
  }

  redirect(`/home?${nextParams.toString()}`);
}
