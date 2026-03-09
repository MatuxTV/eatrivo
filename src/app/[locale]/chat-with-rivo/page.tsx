import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ChatWithRivoPageWrapper({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}/signin`);
  }

  redirect(`/${safeLocale}/home?section=chatWithRivo`);
}
