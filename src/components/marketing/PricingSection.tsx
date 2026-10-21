import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { CheckRow, Container, PrimaryButtonLink } from "./primitives";

const FREE_FEATURES = ["pantry", "recipes", "profile", "shopping"] as const;
const PLUS_FEATURES = ["everything", "receipt", "barcode", "support"] as const;

/**
 * Pricing section: the free plan next to the Plus plan, with every CTA pointing
 * at the sign-in flow (checkout happens after sign-up).
 */
export default async function PricingSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.pricing" });
  const signInHref = `/${locale}/signin`;

  return (
    <section id="cennik" className="scroll-mt-20 bg-mk-bg pt-16 pb-14 lg:py-28">
      <Container>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:items-center lg:text-center">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-text lg:max-w-[800px] lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("title")}
            </h2>
            <p className="text-[16px] font-medium leading-[1.55] text-mk-text-2 lg:max-w-[640px] lg:text-[19px]">
              {t("description")}
            </p>
          </div>

          {/* `items-stretch` keeps both cards the same height, `mt-auto` pins the buttons. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-6 lg:pt-10">
            {/* Free */}
            <div className="flex flex-col gap-4 rounded-3xl border border-mk-border bg-mk-surface px-[22px] py-6 lg:w-[440px] lg:shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[20px] font-bold leading-[1.2] text-mk-text">
                  {t("free.name")}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold leading-none tracking-[-0.03em] text-mk-text">
                  {t("free.price")}
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-1 pb-2">
                {FREE_FEATURES.map((feature) => (
                  <CheckRow key={feature}>{t(`free.features.${feature}`)}</CheckRow>
                ))}
              </div>

              <PrimaryButtonLink href={signInHref} className="mt-auto w-full">
                {t("free.cta")}
              </PrimaryButtonLink>
            </div>

            {/* Plus */}
            <div className="flex flex-col gap-4 rounded-3xl bg-mk-purple-deep px-[22px] py-6 text-white shadow-[0_20px_50px_rgba(41,18,97,0.3)] lg:w-[440px] lg:shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[20px] font-bold leading-[1.2] text-white">{t("plus.name")}</span>
                <span className="inline-flex items-center rounded-full bg-white/12 px-2 py-[3px] text-[11px] font-bold leading-[1.2] tracking-[0.08em] text-white">
                  {t("plus.badge")}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold leading-none tracking-[-0.03em] text-white">
                  {t("plus.price")}
                </span>
                <span className="text-[15px] font-semibold leading-[1.2] text-mk-purple-soft">
                  {t("plus.period")}
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-1 pb-2">
                {PLUS_FEATURES.map((feature) => (
                  <CheckRow key={feature} tone="dark">
                    {t(`plus.features.${feature}`)}
                  </CheckRow>
                ))}
              </div>

              <Link
                href={signInHref}
                className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-mk-purple-soft px-6 py-[17px] text-[17px] font-bold leading-[1.2] text-mk-purple transition motion-safe:hover:brightness-105 motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple"
              >
                {t("plus.cta")}
              </Link>
            </div>
          </div>

          <p className="text-center text-[13px] font-semibold leading-[1.4] text-mk-text-2">
            {t("trust")}
          </p>
        </div>
      </Container>
    </section>
  );
}
