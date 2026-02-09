import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";

export default function OnboardingPageWrapper() {
  redirect(`/${defaultLocale}/onboarding`);
}
    redirect("/dashboard")
  }

  return <OnboardingClient userEmail={session.user.email || undefined} />;
}