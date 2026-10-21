import { Camera, Check, Receipt, ScanBarcode } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/utils";

import { Container, INGREDIENTS, IngredientThumb, PlusBadge } from "./primitives";

/* "Other methods" rows (spec B2): receipt + barcode scan. */
const METHODS = [
  {
    key: "receipt",
    Icon: Receipt,
    titleKey: "receiptTitle",
    descriptionKey: "receiptDescription",
  },
  {
    key: "barcode",
    Icon: ScanBarcode,
    titleKey: "barcodeTitle",
    descriptionKey: "barcodeDescription",
  },
] as const;

/**
 * Purple "fill your pantry" section: the photo-confirm sheet mock plus the two
 * alternative capture methods. The sheet is a decorative illustration, not a form.
 */
export default async function FillSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.fill" });

  return (
    <section id="funkcie" className="scroll-mt-20 bg-mk-purple pt-16 pb-14 lg:py-28">
      <Container>
        {/*
          Mobile stacks: h2 → description → sheet → confirm note → other methods.
          Desktop keeps the copy on the left (description and note merged into one
          paragraph) and pins the sheet to the right, so the sheet and the merged
          paragraph are placed explicitly from `lg` up.
        */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px] lg:grid-rows-[1fr_auto_auto_auto_1fr] lg:gap-x-28 lg:gap-y-5">
          <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-white lg:col-start-1 lg:row-start-2 lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>

          <p className="text-[16px] font-medium leading-[1.55] text-mk-purple-soft lg:hidden">
            {t("description")}
          </p>

          {/* Photo confirm sheet — decorative mock */}
          <div
            role="img"
            aria-label={t("sheetTitle")}
            className="flex flex-col gap-1 rounded-3xl bg-mk-surface py-5 px-[18px] text-mk-text shadow-[0_20px_55px_rgba(121,78,171,0.14)] lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-center"
          >
            <div className="flex items-center gap-3 pb-3">
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-mk-purple-soft"
                aria-hidden="true"
              >
                <Camera size={20} className="text-mk-purple" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[17px] font-bold leading-[1.25] text-mk-text">
                  {t("sheetTitle")}
                </span>
                <span className="text-[13px] font-medium leading-[1.3] text-mk-text-2">
                  {t("sheetMeta")}
                </span>
              </div>
            </div>

            {INGREDIENTS.map((ingredient) => {
              // Rivo is unsure about the spinach amount, so that row warns instead.
              const needsReview = ingredient.key === "spinach";

              return (
                <div key={ingredient.key} className="flex items-center gap-3 py-2">
                  <IngredientThumb cx={ingredient.cx} cy={ingredient.cy} size={36} />

                  <div className="flex flex-1 flex-col gap-px">
                    <span className="text-[15px] font-bold leading-[1.3] text-mk-text">
                      {t(`items.${ingredient.key}.name`)}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] leading-[1.3]",
                        needsReview
                          ? "font-bold text-mk-orange-deep"
                          : "font-medium text-mk-text-2",
                      )}
                    >
                      {needsReview ? t("checkQuantity") : t(`items.${ingredient.key}.qty`)}
                    </span>
                  </div>

                  <span
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-mk-purple"
                    aria-hidden="true"
                  >
                    <Check size={14} strokeWidth={3} className="text-white" />
                  </span>
                </div>
              );
            })}

            <span className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-mk-purple to-mk-purple-2 px-6 py-[17px] text-[17px] font-bold leading-[1.2] text-white shadow-[0_12px_28px_rgba(123,63,242,0.28)]">
              {t("addButton")}
            </span>
          </div>

          <p className="text-[13px] font-semibold leading-[1.4] text-mk-purple-soft lg:hidden">
            {t("confirmNote")}
          </p>

          {/* Desktop copy: description + note as one paragraph */}
          <p className="hidden text-[19px] font-medium leading-[1.55] text-mk-purple-soft lg:col-start-1 lg:row-start-3 lg:block lg:max-w-[500px]">
            {t("description")} {t("confirmNote")}
          </p>

          {/* Other methods */}
          <div className="pt-3 lg:col-start-1 lg:row-start-4">
            {METHODS.map(({ key, Icon, titleKey, descriptionKey }) => (
              <div
                key={key}
                className="flex items-start gap-3.5 border-t border-white/22 py-[18px]"
              >
                <span
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/16"
                  aria-hidden="true"
                >
                  <Icon size={22} className="text-white" />
                </span>

                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-bold leading-[1.3] text-white">
                      {t(titleKey)}
                    </span>
                    <PlusBadge>{t("plusBadge")}</PlusBadge>
                  </div>
                  <p className="text-[15px] font-medium leading-[1.5] text-mk-purple-soft">
                    {t(descriptionKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
