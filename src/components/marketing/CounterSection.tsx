import { Clock, Flame, Leaf, Plus, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/utils";

import CounterFlow from "./CounterFlow";
import { Container, INGREDIENTS } from "./primitives";

export default async function CounterSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.counter" });

  const labels = Object.fromEntries(
    INGREDIENTS.map((ingredient) => [ingredient.key, t(`ingredients.${ingredient.key}`)]),
  );

  const meta = [
    { key: "time", Icon: Clock, label: t("time") },
    { key: "kcal", Icon: Flame, label: t("kcal") },
    { key: "protein", Icon: Leaf, label: t("protein") },
  ];

  return (
    <section
      id="ako-to-funguje"
      className="scroll-mt-20 rounded-t-[32px] bg-mk-surface pt-14 pb-16 lg:rounded-t-[48px] lg:py-28"
    >
      <Container>
        <div className="flex flex-col gap-5 lg:gap-16">
          {/* Heading */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-20">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-mk-text lg:flex-1 lg:text-[52px] lg:leading-[1.06] lg:tracking-[-0.035em]">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </h2>
            <p className="text-[16px] font-medium leading-[1.55] text-mk-text-2 lg:w-[480px] lg:shrink-0 lg:text-[19px]">
              {t("description")}
            </p>
          </div>

          {/* Flow + recipe card */}
          <CounterFlow labels={labels} panAlt={t("panAlt")}>
            <div
              role="img"
              aria-label={t("recipeTitle")}
              className="flex flex-col gap-3.5 rounded-3xl border border-mk-border-purple bg-mk-surface p-5 shadow-[0_20px_55px_rgba(121,78,171,0.14)]"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="shrink-0 text-mk-purple" aria-hidden="true" />
                <span className="text-[13px] font-bold leading-[1.2] text-mk-purple">
                  {t("suggests")}
                </span>
              </div>

              <p className="text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-mk-text">
                {t("recipeTitle")}
              </p>

              <div className="flex items-center gap-3.5">
                {meta.map(({ key, Icon, label }) => (
                  <div key={key} className="flex items-center gap-[5px]">
                    <Icon size={16} className="shrink-0 text-mk-text-2" aria-hidden="true" />
                    <span className="text-[14px] font-semibold leading-[1.2] text-mk-text-2">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-px w-full bg-mk-border" aria-hidden="true" />

              <div className="flex items-center justify-between gap-2.5">
                <span className="text-[15px] font-bold leading-[1.3] text-mk-text">
                  {t("have")}
                </span>
                <span className="flex items-center gap-1" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "size-[9px] rounded-full",
                        index < 6 ? "bg-mk-green" : "bg-mk-orange",
                      )}
                    />
                  ))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-mk-orange-soft py-2.5 pl-3.5 pr-2.5">
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold leading-[1.3] text-mk-text">
                    {t("missing")}
                  </span>
                  <span className="text-[13px] font-medium leading-[1.3] text-mk-text-2">
                    {t("missingHint")}
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mk-surface py-2 pl-2.5 pr-3">
                  <Plus size={14} className="shrink-0 text-mk-purple" aria-hidden="true" />
                  <span className="whitespace-nowrap text-[13px] font-bold leading-[1.2] text-mk-purple">
                    {t("addToList")}
                  </span>
                </span>
              </div>
            </div>

            <p className="text-[13px] font-medium leading-[1.4] text-mk-text-2">{t("note")}</p>
          </CounterFlow>
        </div>
      </Container>
    </section>
  );
}
