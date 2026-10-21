import Image from "next/image";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { IngredientTag, PrimaryButtonLink, SecondaryButtonLink } from "./primitives";

/* Tag positions in px inside the 390×440 mobile photo box (spec A3). */
const HERO_TAGS: Array<{ key: string; left?: number; right?: number; top: number }> = [
  { key: "eggs", left: 22 / 390, top: 136 / 440 },
  { key: "tomatoes", left: 150 / 390, top: 152 / 440 },
  { key: "pepper", right: 0.04, top: 128 / 440 },
  { key: "onion", left: 262 / 390, top: 206 / 440 },
  { key: "feta", left: 30 / 390, top: 262 / 440 },
  { key: "spinach", left: 118 / 390, top: 236 / 440 },
];

export default async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.hero" });
  const signInHref = `/${locale}/signin`;

  return (
    <section className="relative">
      <div className="lg:mx-auto lg:max-w-[1280px] lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-[72px] lg:pt-6 lg:pb-[104px]">
          {/* Photo — full-bleed on mobile, 620×660 card on desktop */}
          <div className="relative aspect-[390/440] w-full overflow-hidden rounded-b-[32px] lg:order-2 lg:aspect-[620/660] lg:w-[620px] lg:shrink-0 lg:rounded-[40px] lg:shadow-[0_30px_80px_rgba(41,26,77,0.14)]">
            <Image
              src="/images/landing/hero-counter.webp"
              alt={t("photoAlt")}
              fill
              priority
              sizes="(min-width:1024px) 620px, 100vw"
              className="object-cover"
            />

            {/* Recognized chip */}
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-mk-purple px-3.5 py-2 shadow-[0_10px_24px_rgba(123,63,242,0.35)] lg:left-6 lg:top-6">
              <Sparkles size={16} aria-hidden="true" className="text-white" />
              <span className="text-[13px] font-bold leading-[1.2] text-white">
                {t("recognized")}
              </span>
            </div>

            {/* Ingredient tags */}
            {HERO_TAGS.map((tag) => (
              <div
                key={tag.key}
                className="absolute"
                style={{
                  left: tag.left != null ? `${tag.left * 100}%` : undefined,
                  right: tag.right != null ? `${tag.right * 100}%` : undefined,
                  top: `${tag.top * 100}%`,
                }}
              >
                <IngredientTag label={t(`tags.${tag.key}`)} />
              </div>
            ))}

            {/* Rivo */}
            <div className="absolute bottom-0 right-1.5 aspect-[468/414] w-1/2 lg:right-4 lg:w-[300px]">
              <Image
                src="/images/landing/rivo-hero.webp"
                alt={t("rivoAlt")}
                fill
                sizes="(min-width:1024px) 300px, 50vw"
                className="object-contain object-bottom"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="flex flex-col gap-4 px-5 pt-7 pb-12 lg:order-1 lg:flex-1 lg:gap-6 lg:px-0 lg:pt-0 lg:pb-0">
            <h1 className="text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-mk-text lg:text-[68px] lg:leading-[1.04] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </h1>

            <p className="text-[17px] font-medium leading-[1.55] text-mk-text-2 lg:max-w-[500px] lg:text-[20px]">
              {t("description")}
            </p>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4 lg:pt-3">
              <PrimaryButtonLink href={signInHref} className="w-full lg:w-auto">
                {t("cta")}
              </PrimaryButtonLink>
              <SecondaryButtonLink
                href="#ako-to-funguje"
                className="hidden lg:inline-flex"
              >
                {t("secondaryCta")}
              </SecondaryButtonLink>
            </div>

            <p className="text-center text-[13px] font-semibold leading-[1.45] text-mk-text-2 lg:text-left lg:text-[14px]">
              {t("trust")}
            </p>

            <div className="hidden lg:mt-2 lg:flex lg:max-w-[460px] lg:items-center lg:gap-4 lg:rounded-2xl lg:border lg:border-mk-border-purple lg:bg-mk-surface lg:p-3 lg:pr-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/qr-eatrivo.svg" alt="" aria-hidden="true" width={72} height={72} className="shrink-0" />
              <p className="text-[14px] font-semibold leading-[1.45] text-mk-text-2">{t("desktopHint")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
