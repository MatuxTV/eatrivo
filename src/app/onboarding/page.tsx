import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";
import OnboardingClient from "@/app/onboarding/OnboardingClient";

export default function OnboardingPageWrapper() {
  redirect(`/${defaultLocale}/onboarding`);
  return <OnboardingClient userEmail={session.user.email || undefined} />;
}