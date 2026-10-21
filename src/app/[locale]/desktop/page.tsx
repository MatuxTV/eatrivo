import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import { Logo } from "@/components/marketing/Nav";
import { Container } from "@/components/marketing/primitives";
import { isLocale, type Locale } from "@/i18n/routing";

import DesktopTouchCheck from "./DesktopTouchCheck";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";
  const t = await getTranslations({ locale, namespace: "desktopGate" });

  return {
    title: t("metaTitle"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function DesktopGatePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";
  const t = await getTranslations({ locale, namespace: "desktopGate" });

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="font-brand min-h-screen bg-mk-purple text-white">
      <Container className="py-5">
        <Logo locale={locale} tone="light" />
      </Container>

      <Container className="flex flex-col items-center gap-10 py-12 lg:flex-row lg:justify-center lg:gap-20 lg:py-20">
        <Image
          src="/images/landing/rivo-phone.webp"
          alt={t("imageAlt")}
          width={300}
          height={348}
          priority
          className="h-auto w-auto shrink-0"
        />

        <div className="flex w-full max-w-[520px] flex-col items-center gap-6 lg:items-start">
          <h1 className="text-center text-[40px] font-bold leading-[1.06] tracking-[-0.035em] text-white lg:text-left lg:text-[56px]">
            {t("title")}
          </h1>

          <p className="text-center text-[19px] font-medium leading-[1.55] text-mk-purple-soft lg:text-left">
            {t("description")}
          </p>

          <div className="inline-flex items-center gap-5 rounded-3xl bg-white p-5 text-mk-text shadow-[0_20px_50px_rgba(26,8,64,0.3)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed */}
            <img
              src="/images/qr-eatrivo.svg"
              alt={t("qrAlt")}
              width={132}
              height={132}
            />
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-bold leading-[1.3]">{t("qrCaption")}</p>
              <p className="text-[15px] font-semibold leading-[1.3] text-mk-purple">
                eatrivo.sk
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-mk-purple-soft">
              {t("stepsTitle")}
            </p>
            <ol className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/16 text-[14px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[16px] font-semibold leading-[1.4] text-white">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <Link
            href={`/${locale}`}
            className="text-[15px] font-bold text-white underline-offset-4 hover:underline"
          >
            {t("back")}
          </Link>
        </div>
      </Container>

      <DesktopTouchCheck />
      <TrackPageEvent eventName="desktop_gate_viewed" metadata={{ locale }} />
    </div>
  );
}
