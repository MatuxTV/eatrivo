import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/../auth";
import BillingPageClient from "@/app/profile/billing/BillingPageClient";
import { isLocale } from "@/i18n/routing";

export default async function BillingPage() {
  const locale = await getLocale();
  const safeLocale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${safeLocale}/signin`);
  }

  return <BillingPageClient />;
}
