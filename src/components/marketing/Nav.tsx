import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/utils";

import { Container, PrimaryButtonLink } from "./primitives";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple";

const LOGO_PATH =
  "M14.3679 27.879C13.842 27.6918 13.216 27.1058 13.0574 26.65C12.8571 26.0721 12.8905 25.5105 13.3412 21.9292C13.7919 18.3887 13.7919 18.6084 13.408 18.1527C13.3496 18.0875 12.8404 17.6887 12.2812 17.2818C9.20118 15.0191 7.6737 13.4563 6.73885 11.6087C6.51349 11.1611 6.24639 10.4855 6.15457 10.103C5.47013 7.43333 7.12281 4.74739 9.84388 4.12068C11.6301 3.71372 13.6417 4.35671 15.0356 5.78107L15.4947 6.25315L16.1541 5.62643C17.9236 3.95789 20.2941 3.53465 22.3057 4.53578C23.0403 4.90204 23.4993 5.2683 23.9417 5.83805C25.1771 7.43333 25.3356 9.44371 24.3924 11.4053C23.4326 13.3831 21.8383 15.0435 18.6582 17.3387C17.8485 17.9166 17.4646 18.2503 17.3727 18.4457C17.2392 18.7143 17.2559 18.8689 17.6816 22.0676C17.9904 24.4117 18.1073 25.5675 18.0822 25.9581C18.0155 26.829 17.6482 27.3744 16.8469 27.7732C16.3544 28.0174 14.9271 28.0825 14.3679 27.879ZM16.296 26.536C16.8803 26.243 16.8886 25.9256 16.3878 22.0269C16.1791 20.4153 15.9872 18.8038 15.9621 18.4457C15.912 17.8027 15.9204 17.7945 16.1875 17.4771C16.3377 17.3062 17.0222 16.7527 17.715 16.2562C21.5378 13.4889 23.2489 11.4541 23.5661 9.28093C23.6997 8.38562 23.2322 7.18915 22.4476 6.44035C21.3208 5.36597 19.8518 5.12994 18.4662 5.78921C17.8485 6.08222 16.922 6.90428 16.3377 7.66937C15.6783 8.52398 15.4196 8.52398 14.7685 7.66937C13.5248 6.03339 11.9473 5.22761 10.4616 5.46364C9.11771 5.67526 7.89907 6.78219 7.5485 8.10888C7.29809 9.02047 7.4233 9.753 8.04096 10.9576C8.8673 12.5854 10.4198 14.1482 13.2995 16.2399C14.7685 17.3143 15.0941 17.648 15.0941 18.0957C15.0941 18.2666 14.9855 19.2596 14.8436 20.3014C14.2176 25.1279 14.034 25.5919 14.251 26.007C14.2844 26.1209 14.418 26.3325 14.5014 26.4139C14.5014 26.4139 14.7018 26.5197 14.8854 26.5849C15.2443 26.7151 15.9788 26.6907 16.296 26.536Z";

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

export async function Logo({
  locale,
  tone = "dark",
}: {
  locale: Locale;
  tone?: "dark" | "light";
}) {
  const t = await getTranslations({ locale, namespace: "marketing.nav" });

  return (
    <Link
      href={`/${locale}`}
      aria-label={t("homeAria")}
      className={cn("inline-flex items-center gap-2", focusRing)}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 31 31"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="15.5" cy="15.5" r="15.5" fill="#7B3FF2" />
        <path d={LOGO_PATH} fill="#FFFFFF" />
      </svg>
      <span
        className={cn(
          "text-[18px] font-bold leading-[1.2] tracking-[0.06em]",
          tone === "light" ? "text-white" : "text-mk-text",
        )}
      >
        EATRIVO
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Nav                                                                         */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  { key: "howItWorks", href: "#ako-to-funguje" },
  { key: "features", href: "#funkcie" },
  { key: "pricing", href: "#cennik" },
] as const;

export default async function Nav({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.nav" });
  const signInHref = `/${locale}/signin`;

  return (
    <header className="sticky top-0 z-40 bg-mk-bg/85 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between py-3.5 lg:py-5">
          <Logo locale={locale} />

          <nav className="hidden items-center gap-10 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={cn(
                  "text-[16px] font-semibold leading-[1.2] text-mk-text-2 transition hover:text-mk-text",
                  focusRing,
                )}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <Link
              href={signInHref}
              className={cn(
                "text-[15px] font-bold leading-[1.2] text-mk-purple transition lg:text-[16px]",
                focusRing,
              )}
            >
              {t("signIn")}
            </Link>
            <PrimaryButtonLink
              href={signInHref}
              size="sm"
              showArrow={false}
              className="hidden lg:inline-flex"
            >
              {t("startFree")}
            </PrimaryButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
