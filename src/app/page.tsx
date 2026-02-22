import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale } from "@/i18n/routing";

export default async function RootPage() {
  // Get headers to determine preferred locale
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  
  // Simple locale detection
  let locale = defaultLocale;
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim()?.toLowerCase();
    const primaryTag = primary?.split("-")[0];
    if (primaryTag === "sk" || primaryTag === "cs") {
      locale = "sk";
    } else if (primaryTag === "en") {
      locale = "en";
    }
  }
  
  // Redirect to localized version
  redirect(`/${locale}`);
}
