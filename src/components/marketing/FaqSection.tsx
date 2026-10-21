import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { Container } from "./primitives";

/** Questions in display order; the first one starts open. */
const ITEMS = ["free", "photo", "diet", "allergies", "cancel"] as const;

/**
 * FAQ section: native `<details>` accordion, so it works without JavaScript.
 * Every answer comes from `marketing.faq.items`.
 */
export default async function FaqSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.faq" });

  return (
    <section id="faq" className="bg-mk-surface pt-16 pb-14 lg:py-28">
      <Container>
        {/* Mobile: heading row beside the illustration. Desktop: heading column 400px. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-24">
          <div className="flex items-center justify-between gap-3 lg:w-[400px] lg:shrink-0 lg:flex-col lg:items-start lg:gap-6">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-text lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("title")}
            </h2>

            <div className="relative h-[84px] w-[84px] shrink-0 lg:h-[180px] lg:w-[180px]">
              <Image
                src="/images/landing/rivo-think.webp"
                alt={t("imageAlt")}
                fill
                sizes="(min-width:1024px) 180px, 84px"
                className="object-contain"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-1">
            {ITEMS.map((item) => (
              <details
                key={item}
                open={item === "free"}
                className="group border-b border-mk-border py-[18px]"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-purple [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-[17px] font-bold leading-[1.35] text-mk-text">
                    {t(`items.${item}.q`)}
                  </span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-mk-purple transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pt-2.5 text-[15px] font-medium leading-[1.55] text-mk-text-2">
                  {t(`items.${item}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}