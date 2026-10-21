import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { Container, OnDarkButtonLink } from "./primitives";

/**
 * Closing call to action on the purple band: illustration, headline, one CTA
 * and the trust line.
 */
export default async function FinalCta({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.finalCta" });

  return (
    <section className="bg-mk-purple pt-16 pb-14 text-white lg:py-[88px]">
      <Container>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-20">
          <div className="relative h-[230px] w-[200px] shrink-0 lg:h-[345px] lg:w-[300px]">
            <Image
              src="/images/landing/rivo-phone.webp"
              alt={t("imageAlt")}
              fill
              sizes="(min-width:1024px) 300px, 200px"
              className="object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-4 lg:w-[620px] lg:shrink-0 lg:items-start">
            {/* One line from `lg`, two lines below it. */}
            <h2 className="text-center text-[36px] font-bold leading-[1.08] tracking-[-0.03em] text-white lg:text-left lg:text-[56px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br className="lg:hidden" />
              {" "}
              {t("titleLine2")}
            </h2>

            <p className="text-center text-[16px] font-medium leading-[1.55] text-mk-purple-soft lg:text-left lg:text-[19px]">
              {t("description")}
            </p>

            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-5">
              <OnDarkButtonLink href={`/${locale}/signin`}>{t("cta")}</OnDarkButtonLink>
              <p className="text-center text-[13px] font-semibold leading-[1.4] text-mk-purple-soft lg:text-left">
                {t("trust")}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}