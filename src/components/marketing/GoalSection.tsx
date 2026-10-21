import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/utils";

import { CheckRow, Chip, Container } from "./primitives";

/** Segmented-control options in display order; only `lose` is selected. */
const GOALS = ["lose", "maintain", "gain"] as const;

/** Diet chips in display order with the two preselected ones flagged. */
const DIETS = [
  { key: "vegetarian", selected: true },
  { key: "lactoseFree", selected: true },
  { key: "nutFree", selected: false },
  { key: "vegan", selected: false },
  { key: "glutenFree", selected: false },
  { key: "fishFree", selected: false },
] as const;

const CHECKS = ["macros", "allergens", "setup"] as const;

/**
 * "Your goal, your rules" section: a decorative mock of the signup step where
 * the user picks a goal and diet. The controls are static, not a real form.
 */
export default async function GoalSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.goal" });

  return (
    <section className="bg-mk-surface pt-16 pb-14 lg:py-28">
      <Container>
        {/* Mobile reads h2 → description → controls; desktop moves the panel left. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-28">
          <div className="flex flex-col gap-4 lg:order-2 lg:flex-1">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-text lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </h2>
            <p className="text-[16px] font-medium leading-[1.55] text-mk-text-2 lg:max-w-[480px] lg:text-[19px]">
              {t("description")}
            </p>
          </div>

          {/* Panel: no frame below `lg`, so the mock sits straight on the white section. */}
          <div className="flex flex-col gap-6 lg:order-1 lg:w-[560px] lg:shrink-0 lg:rounded-[32px] lg:bg-mk-bg lg:p-9">
            {/* Segmented goal control — decorative, no locale label key exists for the copy. */}
            <div
              role="img"
              aria-label={t("goalsAria")}
              className="flex gap-1 rounded-full border border-mk-border bg-mk-bg p-1"
            >
              {GOALS.map((goal) => (
                <div
                  key={goal}
                  className={cn(
                    "flex-1 rounded-full py-3 text-center text-[14px] font-bold leading-[1.2]",
                    goal === "lose"
                      ? "bg-gradient-to-r from-mk-purple to-mk-purple-2 text-white shadow-[0_10px_24px_rgba(123,63,242,0.22)]"
                      : "text-mk-text-2",
                  )}
                >
                  {t(`goals.${goal}`)}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2" aria-hidden="true">
              {DIETS.map(({ key, selected }) => (
                <Chip key={key} selected={selected}>
                  {t(`diets.${key}`)}
                </Chip>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {CHECKS.map((check) => (
                <CheckRow key={check}>{t(`checks.${check}`)}</CheckRow>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
