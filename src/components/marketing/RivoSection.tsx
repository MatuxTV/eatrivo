import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { Container } from "./primitives";

/**
 * "Rivo, chef in your pocket" section: the meal-plan illustration next to the
 * heading and a decorative mock of a chat with Rivo.
 */
export default async function RivoSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.rivo" });

  return (
    <section className="bg-mk-purple-soft pt-16 pb-14 text-mk-purple-deep lg:py-28">
      <Container>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-24">
          {/*
            Mobile: heading beside the illustration, description underneath.
            Desktop: illustration beside a column holding heading + description.
          */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-5 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center lg:gap-x-6">
            <h2 className="col-start-1 row-start-1 text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-purple-deep lg:col-start-2 lg:self-end lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
              <br />
              {t("titleLine3")}
            </h2>

            <div className="relative col-start-2 row-start-1 h-[172px] w-[150px] shrink-0 lg:col-start-1 lg:row-span-2 lg:self-center lg:h-[276px] lg:w-[240px]">
              <Image
                src="/images/landing/rivo-plan.webp"
                alt={t("imageAlt")}
                fill
                sizes="(min-width:1024px) 240px, 150px"
                className="object-contain"
              />
            </div>

            <p className="col-span-2 row-start-2 text-[16px] font-medium leading-[1.55] text-mk-purple-deep lg:col-span-1 lg:col-start-2 lg:self-start lg:text-[19px]">
              {t("description")}
            </p>
          </div>

          {/* Chat mock — decorative. The text stays real so the mock reads naturally. */}
          <div
            role="img"
            aria-label={t("chatAria")}
            className="flex flex-col gap-3 rounded-3xl bg-mk-surface py-5 px-4 shadow-[0_20px_55px_rgba(121,78,171,0.14)] lg:w-[500px] lg:shrink-0"
          >
            <div className="flex justify-end">
              <p className="max-w-[240px] rounded-[20px] rounded-br-md bg-mk-purple py-3 px-3.5 text-[15px] font-semibold leading-[1.45] text-white">
                {t("userMessage")}
              </p>
            </div>

            <div className="flex items-start gap-2">
              {/* Rivo's face, cropped out of the full-body illustration. */}
              <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-mk-purple-soft">
                <Image
                  src="/images/landing/rivo-hero.webp"
                  alt=""
                  aria-hidden="true"
                  width={64}
                  height={64}
                  className="absolute inset-0 size-full object-contain p-0.5"
                />
              </span>

              <div className="flex max-w-[260px] flex-col gap-1 rounded-[20px] rounded-bl-md border border-mk-border-purple bg-mk-bg px-3.5 py-3">
                <span className="text-[12px] font-bold leading-[1.2] text-mk-purple">
                  {t("name")}
                </span>
                <p className="text-[15px] font-medium leading-[1.5] text-mk-text">{t("reply")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pl-10">
              <span className="inline-flex items-center rounded-full border-[1.5px] border-mk-purple bg-mk-purple-soft px-3.5 py-[9px] text-[14px] font-bold leading-[1.2] text-mk-purple">
                {t("quickYes")}
              </span>
              <span className="inline-flex items-center rounded-full border-[1.5px] border-mk-border-purple bg-mk-surface px-3.5 py-[9px] text-[14px] font-bold leading-[1.2] text-mk-purple">
                {t("quickOther")}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
