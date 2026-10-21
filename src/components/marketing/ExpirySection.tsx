import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { Container, INGREDIENTS, IngredientThumb } from "./primitives";

/**
 * Pantry rows in spec order (subset of `INGREDIENTS`, whose crop centres are
 * reused so the ingredient crops stay in one place).
 */
const ROWS = ["spinach", "feta", "tomatoes", "eggs"].flatMap((key) =>
  INGREDIENTS.filter((ingredient) => ingredient.key === key),
);

/** Rows that expire soon use the orange pill, the rest the green one. */
const SOON = new Set(["spinach", "feta"]);

/**
 * "Use it up first" section: the pantry list with expiry pills and Rivo's tip.
 * The list is a decorative illustration of the app's pantry screen.
 */
export default async function ExpirySection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.expiry" });

  return (
    <section className="bg-mk-bg pt-16 pb-14 lg:py-28">
      <Container>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-28">
          {/* Copy */}
          <div className="flex flex-col gap-4 lg:flex-1">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-text lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </h2>
            <p className="text-[16px] font-medium leading-[1.55] text-mk-text-2 lg:max-w-[480px] lg:text-[19px]">
              {t("description")}
            </p>
          </div>

          {/* Pantry list + tip */}
          <div className="flex flex-col gap-4 lg:w-[560px] lg:shrink-0">
            {/* Pantry screen mock — decorative, no locale label key exists for it. */}
            <div
              aria-hidden="true"
              className="rounded-3xl bg-mk-surface py-1.5 px-4 shadow-[0_10px_30px_rgba(18,23,38,0.07)]"
            >
              {ROWS.map(({ key, cx, cy }, index) => (
                <div
                  key={key}
                  className={
                    index > 0
                      ? "flex items-center gap-3 border-t border-mk-border py-3"
                      : "flex items-center gap-3 py-3"
                  }
                >
                  <IngredientThumb cx={cx} cy={cy} size={40} />

                  <div className="flex flex-1 flex-col gap-px">
                    <span className="text-[15px] font-bold leading-[1.3] text-mk-text">
                      {t(`rows.${key}.name`)}
                    </span>
                    <span className="text-[13px] font-medium leading-[1.3] text-mk-text-2">
                      {t(`rows.${key}.qty`)}
                    </span>
                  </div>

                  <span
                    className={
                      SOON.has(key)
                        ? "shrink-0 rounded-full bg-mk-orange-soft px-2.5 py-[5px] text-[12px] font-bold leading-[1.2] text-mk-orange-deep"
                        : "shrink-0 rounded-full bg-mk-mint px-2.5 py-[5px] text-[12px] font-bold leading-[1.2] text-mk-green-deep"
                    }
                  >
                    {t(`rows.${key}.expires`)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-[20px] bg-mk-purple-soft p-4">
              <span
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-mk-purple"
                aria-hidden="true"
              >
                <Sparkles size={16} className="text-white" />
              </span>
              <p className="text-[15px] font-semibold leading-[1.5] text-mk-purple-deep">
                {t("tip")}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
