"use client";

import { useState } from "react";
import { ChefHat, Loader2, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import type { RecipeCreationFormMessageMetadata } from "@/lib/chat/message-metadata";

type ChatMessageResponse = {
  id: string;
  role: "assistant";
  content: string;
  metadata: unknown;
  createdAt: string;
};

interface RecipeCreationFormCardProps {
  messageId: string;
  metadata: RecipeCreationFormMessageMetadata;
  sessionId: string;
  disabled?: boolean;
  onCreated: (message: ChatMessageResponse) => void;
}

export default function RecipeCreationFormCard({
  messageId,
  metadata,
  sessionId,
  disabled = false,
  onCreated,
}: RecipeCreationFormCardProps) {
  const locale = useLocale() as "en" | "sk";
  const defaultIncludeProfile = metadata.defaults?.includeProfile ?? true;
  const defaultIncludePantry = metadata.defaults?.includePantry ?? true;
  const defaultServings = metadata.defaults?.servings ?? 2;
  const defaultMealType = metadata.defaults?.mealType ?? "dinner";
  const defaultMealPrep = metadata.defaults?.mealPrep ?? false;
  const capturedBrief = (metadata.defaults?.initialBrief ?? "").trim();
  const clampServings = (value: number) => Math.min(10, Math.max(1, value));

  const [includeProfile, setIncludeProfile] = useState(defaultIncludeProfile);
  const [includePantry, setIncludePantry] = useState(defaultIncludePantry);
  const [servings, setServings] = useState<number | null>(defaultServings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/recipe-creation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMessageId: messageId,
          sessionId,
          locale,
          includeProfile,
          includePantry,
          includeBrief: true,
          brief: capturedBrief,
          servings: servings ?? defaultServings,
          mealType: defaultMealType,
          mealPrep: defaultMealPrep,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: ChatMessageResponse; error?: string }
        | null;

      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error ?? "Recipe creation failed");
      }

      onCreated(payload.message);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Recipe creation failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-3 w-full max-w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-eatrivo-purple/15 bg-white shadow-[0_12px_30px_rgba(123,63,242,0.08)]">
      <div className="border-b border-eatrivo-purple/10 bg-gradient-to-r from-eatrivo-purple/8 via-white to-eatrivo-pink/8 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-eatrivo-black-primary">
          <ChefHat className="h-4 w-4 text-eatrivo-purple" />
          <span>{metadata.title}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-eatrivo-black-secondary">{metadata.description}</p>
      </div>

      <div className="min-w-0 space-y-4 px-4 py-4">
        {capturedBrief ? (
          <div className="rounded-2xl border border-eatrivo-purple/15 bg-eatrivo-purple/6 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eatrivo-black-secondary/70">
              Tvoje zadanie
            </p>
            <p className="mt-1 text-sm leading-6 text-eatrivo-black-primary">
              {capturedBrief}
            </p>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {metadata.options.map((option) => {
            const checked =
              option.id === "includeProfile"
                ? includeProfile
                : includePantry;

            const toggle = () => {
              if (option.id === "includeProfile") setIncludeProfile((value) => !value);
              if (option.id === "includePantry") setIncludePantry((value) => !value);
            };

            return (
              <button
                key={option.id}
                type="button"
                onClick={toggle}
                disabled={disabled || isSubmitting}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  checked
                    ? "border-eatrivo-purple/30 bg-eatrivo-purple/8"
                    : "border-eatrivo-purple/10 bg-white hover:border-eatrivo-purple/20"
                }`}
              >
                <p className="text-sm font-semibold text-eatrivo-black-primary">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-eatrivo-black-secondary">{option.description}</p>
              </button>
            );
          })}
        </div>

        <label className="block space-y-1 text-xs font-medium text-eatrivo-black-secondary">
          <span>Porcie</span>
          <input
            type="number"
            min={1}
            max={10}
            value={servings ?? ""}
            disabled={disabled || isSubmitting}
            onChange={(event) => {
              const rawValue = event.target.value;

              if (rawValue === "") {
                setServings(null);
                return;
              }

              const nextValue = Number(rawValue);
              if (Number.isNaN(nextValue)) {
                return;
              }

              setServings(clampServings(nextValue));
            }}
            onBlur={() => {
              if (servings === null) {
                setServings(defaultServings);
                return;
              }

              setServings(clampServings(servings));
            }}
            className="h-11 w-full rounded-2xl border border-eatrivo-purple/10 px-3 text-sm text-eatrivo-black-primary outline-none focus:border-eatrivo-purple/30"
          />
        </label>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting}
          className="h-11 w-full rounded-2xl bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {metadata.submitLabel}
        </Button>
      </div>
    </div>
  );
}