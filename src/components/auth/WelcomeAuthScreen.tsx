import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signIn } from "../../../auth";
import type { Locale } from "@/i18n/routing";
import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";

type WelcomeAuthScreenProps = {
  locale: Locale;
  surface: "locale_root" | "signin_page";
};

async function continueWithGoogle(locale: Locale) {
  "use server";

  await signIn("google", { redirectTo: `/${locale}/onboarding` });
}

function ProviderButton({
  children,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

export async function WelcomeAuthScreen({
  locale,
  surface,
}: WelcomeAuthScreenProps) {
  const welcomeT = await getTranslations({ locale, namespace: "auth.welcome" });
  const signInT = await getTranslations({ locale, namespace: "auth.signIn" });
  const agreementT = await getTranslations({
    locale,
    namespace: "auth.signIn.agreement",
  });

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-6 sm:px-6">
        <TrackPageEvent
          eventName="welcome_auth_viewed"
          metadata={{ locale, surface, entrypoint: "direct" }}
        />

        <div className="w-full max-w-[25rem] rounded-[2rem] bg-eatrivo-white-primary px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
          <div className="flex justify-center">
            <div
            
              className="inline-flex items-center justify-center rounded-full px-2 py-1 transition-transform duration-200 "
            >
              <Image
                src="/logo/LOGO_ROW.png"
                alt={welcomeT("logoAlt")}
                width={146}
                height={36}
                priority
                className="h-auto w-[9.125rem]"
              />
            </div>
          </div>

          <div className="mt-7 text-center">
            <h1 className="text-[3rem] font-medium font-sans leading-[0.92] tracking-[-0.06em] text-[#17121f] sm:text-[2.85rem]">
              <span className="block">{welcomeT("headlineTop")}</span>
              <span className="mt-1 block">{welcomeT("headlineBottom")}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[18rem] text-sm font-medium leading-6 text-[#6b6478] sm:max-w-[20rem]">
              {welcomeT("subtitle")}
            </p>
          </div>

          <div className="relative mx-auto mt-7 flex w-full max-w-[16rem] items-center justify-center rounded-[2rem] ">
            <div className="absolute inset-x-5 bottom-3 h-7 rounded-full " />
            <Image
              src="/rivo/RIVO7-login.png"
              alt={welcomeT("illustrationAlt")}
              width={360}
              height={220}
              priority
              className="relative h-auto w-full"
            />
          </div>

          <div className="mt-8 space-y-3">
            
 

            <form action={continueWithGoogle.bind(null, locale)}>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d7d3df] bg-white px-5 text-sm font-bold text-[#262231]  transition-transform duration-200 hover:scale-[1.01] active:scale-[0.9]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.18-1.95H12v3.69h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.26Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.57-4.1H3.09v2.58A9.98 9.98 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.43 13.93A5.98 5.98 0 0 1 6.1 12c0-.67.12-1.32.33-1.93V7.5H3.09A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.09 4.5l3.34-2.57Z" />
                  <path fill="#EA4335" d="M12 5.96c1.47 0 2.78.5 3.81 1.48l2.86-2.86C16.95 2.98 14.69 2 12 2A9.98 9.98 0 0 0 3.09 7.5l3.34 2.57c.78-2.35 2.98-4.11 5.57-4.11Z" />
                </svg>
                {signInT("googleButton")}
              </button>
            </form>
          </div>


          <p className="mx-auto mt-5 max-w-[17rem]  text-center text-[11px] leading-5 text-[#948ca3] sm:max-w-[19rem]">
            {agreementT("prefix")} <Link href={`/${locale}/terms-of-service`} className="font-semibold text-[#5f3db2] underline underline-offset-2">{agreementT("terms")}</Link> {agreementT("and")} <Link href={`/${locale}/privacy-policy`} className="font-semibold text-[#5f3db2] underline underline-offset-2">{agreementT("privacy")}</Link>.
          </p>
        </div>
    </div>
  );
}