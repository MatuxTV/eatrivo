import { getTranslations } from "next-intl/server";

import { signIn } from "../../../auth";
import type { Locale } from "@/i18n/routing";
import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { SignInIntroCarousel } from "@/components/auth/SignInIntroCarousel";

type WelcomeAuthScreenProps = {
  locale: Locale;
};

async function continueWithGoogle(locale: Locale) {
  "use server";

  await signIn("google", { redirectTo: `/${locale}/onboarding` });
}

export async function WelcomeAuthScreen({
  locale,
}: WelcomeAuthScreenProps) {
  const welcomeT = await getTranslations({ locale, namespace: "auth.welcome" });
  const signInT = await getTranslations({ locale, namespace: "auth.signIn" });
  const agreementT = await getTranslations({
    locale,
    namespace: "auth.signIn.agreement",
  });
  const introT = await getTranslations({ locale, namespace: "auth.intro" });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <TrackPageEvent
        eventName="welcome_auth_viewed"
        metadata={{ locale, surface: "signin_page", entrypoint: "direct" }}
      />

      <SignInIntroCarousel
        locale={locale}
        logoAlt={welcomeT("logoAlt")}
        headlineTop={welcomeT("headlineTop")}
        headlineBottom={welcomeT("headlineBottom")}
        subtitle={welcomeT("subtitle")}
        illustrationAlt={welcomeT("illustrationAlt")}
        continueLabel={introT("common.continue")}
        skipLabel={introT("common.skip")}
        swipeHint={introT("common.swipeHint")}
        googleButtonLabel={signInT("googleButton")}
        termsLabel={agreementT("terms")}
        andLabel={agreementT("and")}
        privacyLabel={agreementT("privacy")}
        agreementPrefix={agreementT("prefix")}
        introSlide={{
          eyebrow: introT("slides.introduction.eyebrow"),
          title: introT("slides.introduction.title"),
          description: introT("slides.introduction.description"),
        }}
        customRecipesSlide={{
          eyebrow: introT("slides.customRecipes.eyebrow"),
          title: introT("slides.customRecipes.title"),
          description: introT("slides.customRecipes.description"),
        }}
        pantrySlide={{
          eyebrow: introT("slides.pantry.eyebrow"),
          title: introT("slides.pantry.title"),
          description: introT("slides.pantry.description"),
        }}
        googleAction={continueWithGoogle.bind(null, locale)}
      />
    </div>
  );
}