"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { cn } from "@/lib/utils/utils";
import { isLocale, type Locale } from "@/i18n/routing";
import { SK, GB } from "country-flag-icons/react/3x2";
import { updateLocale } from "@/app/actions/update-locale";

const LANGUAGE_OPTIONS: Array<{
  value: Locale;
}> = [
  { value: "sk" },
  { value: "en" },
];

function FlagMark({ locale }: { locale: Locale }) {
  if (locale === "sk") {
    return (
      <SK className="block h-3.5 w-5 overflow-hidden rounded-[4px] ring-1 ring-black/10" />
    );
  }

  return (
    <GB className="block h-3.5 w-5 overflow-hidden rounded-[4px] ring-1 ring-black/10" />
  );
}

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const currentLocale = isLocale(locale) ? locale : "sk";
  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.value === currentLocale) ??
    LANGUAGE_OPTIONS[0];
  const nextOption =
    LANGUAGE_OPTIONS.find((option) => option.value !== currentLocale) ??
    LANGUAGE_OPTIONS[0];

  const handleToggle = () => {
    startTransition(async () => {
      await updateLocale(nextOption.value);
      // Reload the current page — middleware will serve the new locale
      // without changing the URL shape, keeping PWA standalone intact
      window.location.reload();
    });
  };

  return (
    <button
      type="button"
      aria-label={`${t("navbar.language")}: ${nextOption.value.toUpperCase()}`}
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full  p-0 **:backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/15",
        isPending && "opacity-50",
        className,
      )}
    >
      <FlagMark locale={currentOption.value} />
      <span className="sr-only">
        {t("navbar.language")} {nextOption.value.toUpperCase()}
      </span>
    </button>
  );
}