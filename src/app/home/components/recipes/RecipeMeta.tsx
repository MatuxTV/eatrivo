"use client";

import { Clock, Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/utils";

interface RecipeMetaProps {
  minutes: number;
  calories: number;
  label?: string | null;
  className?: string;
}

/** Time + calories row, with an optional trailing label (category / meal prep). */
export function RecipeMeta({
  minutes,
  calories,
  label,
  className,
}: RecipeMetaProps) {
  const t = useTranslations("home");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold text-gray-500",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {`${minutes} ${t("time.minutesShort")}`}
      </span>
      <span className="inline-flex items-center gap-1">
        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
        {`${calories} kcal`}
      </span>
      {label ? <span>· {label}</span> : null}
    </div>
  );
}
