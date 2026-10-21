import Link from "next/link";
import { Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/utils";

import { Logo } from "./Nav";
import { Container } from "./primitives";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple";

const headingClass = "text-[13px] font-bold leading-[1.3] tracking-[0.04em] text-white";

const linkClass =
  "text-[14px] font-medium leading-[1.4] text-mk-purple-soft transition hover:text-white lg:whitespace-nowrap";

export default async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.footer" });

  const productLinks = [
    { key: "howItWorks", href: "#ako-to-funguje" },
    { key: "pricing", href: "#cennik" },
    { key: "signIn", href: `/${locale}/signin` },
  ] as const;

  const legalLinks = [
    { key: "terms", href: `/${locale}/terms-of-service` },
    { key: "privacy", href: `/${locale}/privacy-policy` },
    { key: "cookies", href: `/${locale}/cookie-policy` },
    { key: "medical", href: `/${locale}/medical-disclaimer` },
    { key: "complaints", href: `/${locale}/complaints-policy` },
  ] as const;

  return (
    <footer className="bg-mk-purple-deep text-white">
      <Container>
        <div className="flex flex-col gap-7 pt-10 pb-9 lg:gap-12 lg:pt-16 lg:pb-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-24">
            <div className="flex flex-col gap-2.5 lg:flex-1">
              <Logo locale={locale} tone="light" />
              <p className="text-[15px] font-medium leading-[1.5] text-mk-purple-soft lg:text-[16px]">
                {t("tagline")}
              </p>
            </div>

            <div className="flex gap-6 lg:gap-24">
              <div className="flex flex-1 flex-col gap-3">
                <span className={headingClass}>{t("product")}</span>
                {productLinks.map((link) => (
                  <Link key={link.key} href={link.href} className={cn(linkClass, focusRing)}>
                    {t(link.key)}
                  </Link>
                ))}
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <span className={headingClass}>{t("legal")}</span>
                {legalLinks.map((link) => (
                  <Link key={link.key} href={link.href} className={cn(linkClass, focusRing)}>
                    {t(link.key)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-white/16 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 lg:order-2">
              <Globe size={16} aria-hidden="true" className="text-mk-purple-soft" />
              <Link
                href="/sk"
                aria-current={locale === "sk" ? "true" : undefined}
                className={cn(
                  focusRing,
                  "text-[14px] font-semibold leading-[1.3]",
                  locale === "sk" ? "text-white" : "text-mk-purple-soft transition hover:text-white",
                )}
              >
                {t("languageSk")}
              </Link>
              <span className="text-mk-purple-soft" aria-hidden="true">
                ·
              </span>
              <Link
                href="/en"
                aria-current={locale === "en" ? "true" : undefined}
                className={cn(
                  focusRing,
                  "text-[14px] font-semibold leading-[1.3]",
                  locale === "en" ? "text-white" : "text-mk-purple-soft transition hover:text-white",
                )}
              >
                {t("languageEn")}
              </Link>
            </div>

            <p className="text-[13px] font-medium leading-[1.4] text-mk-purple-soft lg:order-1">
              {t("copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
