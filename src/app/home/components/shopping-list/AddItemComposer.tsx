"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { guessFoodCategory } from "@/lib/ingredients/units";
import { cn } from "@/lib/utils/utils";
import { splitCategoryLabel } from "@/app/pantry/components/categoryVisuals";
import type { CustomShoppingItemInput } from "@/hooks/useShoppingList";

const UNIT_CHOICES = ["ks", "g", "kg", "ml", "l", "bal"] as const;

const CATEGORY_CHOICES = [
  "vegetables",
  "fruit",
  "dairy",
  "meat_fish",
  "grains",
  "eggs",
  "condiments",
  "beverages",
  "nuts_seeds",
  "other",
] as const;

// Grams and millilitres step in 50s; everything else in whole units.
const getQuantityStep = (unit: string) => (unit === "g" || unit === "ml" ? 50 : 1);

interface AddItemComposerProps {
  onAdd: (input: CustomShoppingItemInput) => boolean;
  getCategoryLabel: (category: string) => string;
}

export default function AddItemComposer({ onAdd, getCategoryLabel }: AddItemComposerProps) {
  const t = useTranslations("home.basic.shoppingList");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState<string>("ks");
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [isPickingCategory, setIsPickingCategory] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedName = name.trim();
  const isExpanded = trimmedName.length > 0;
  const category = categoryOverride ?? (isExpanded ? guessFoodCategory(trimmedName) : "other");
  const { emoji: categoryEmoji, name: categoryName } = splitCategoryLabel(getCategoryLabel(category));

  const reset = () => {
    setName("");
    setQuantity(null);
    setUnit("ks");
    setCategoryOverride(null);
    setIsPickingCategory(false);
  };

  // The guessed category stays client-side; only a category the user picked is
  // sent, so the server's own match can still correct a wrong guess.
  const submit = () => {
    if (!trimmedName) return;
    const added = onAdd({ name: trimmedName, quantity, unit, category: categoryOverride });
    if (added) {
      reset();
      inputRef.current?.focus();
    }
  };

  const changeQuantity = (direction: 1 | -1) => {
    const step = getQuantityStep(unit);
    const next = (quantity ?? 0) + direction * step;
    setQuantity(next > 0 ? next : null);
  };

  return (
    <div className="space-y-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={cn(
          "rounded-2xl border bg-white transition-[border-color,box-shadow] duration-200",
          isExpanded
            ? "border-2 border-eatrivo-purple p-[13px] shadow-[0_2px_12px_rgba(51,26,102,0.1)]"
            : "border-[#ECE8F5] p-1.5 pl-4",
        )}
      >
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") reset();
            }}
            placeholder={t("addPlaceholder")}
            aria-label={t("addButtonLabel")}
            maxLength={120}
            enterKeyHint="done"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400",
              isExpanded ? "font-bold" : "font-semibold",
            )}
          />
          {isExpanded ? (
            <button
              type="button"
              onClick={reset}
              aria-label={t("addCancel")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/40"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              aria-label={t("addButtonLabel")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-eatrivo-purple text-white transition-transform active:scale-95"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500">{t("addQuantityLabel")}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(-1)}
                        aria-label={t("decreaseQuantity")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-eatrivo-purple active:scale-95"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={quantity ?? ""}
                        onChange={(event) => {
                          const parsed = Number.parseFloat(event.target.value);
                          setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                        }}
                        placeholder="–"
                        aria-label={t("addQuantityLabel")}
                        className="w-10 bg-transparent text-center text-base font-bold text-gray-900 outline-none [appearance:textfield] placeholder:text-gray-400 [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => changeQuantity(1)}
                        aria-label={t("increaseQuantity")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-eatrivo-purple active:scale-95"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
                      {UNIT_CHOICES.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setUnit(choice)}
                          aria-pressed={unit === choice}
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-bold transition-colors",
                            unit === choice
                              ? "bg-eatrivo-purple text-white"
                              : "border border-gray-200 bg-white text-gray-500",
                          )}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500">{t("addCategoryLabel")}</p>
                  {isPickingCategory ? (
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_CHOICES.map((choice) => {
                        const label = splitCategoryLabel(getCategoryLabel(choice));
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => {
                              setCategoryOverride(choice);
                              setIsPickingCategory(false);
                            }}
                            aria-pressed={category === choice}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors",
                              category === choice
                                ? "bg-eatrivo-purple text-white"
                                : "border border-gray-200 bg-white text-gray-600",
                            )}
                          >
                            {label.emoji ? `${label.emoji} ` : ""}
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPickingCategory(true)}
                      className="flex items-center gap-2 text-left"
                    >
                      <span className="rounded-full bg-[#F3EEFE] px-3 py-1.5 text-[13px] font-bold text-eatrivo-purple">
                        {categoryEmoji ? `${categoryEmoji}  ` : ""}
                        {categoryName}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                        {t("addCategoryGuessed")}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={reset}
                    className="h-[46px] rounded-[14px] border border-gray-200 bg-white px-[18px] text-[15px] font-bold text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    {t("addCancel")}
                  </button>
                  <button
                    type="submit"
                    className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-eatrivo-purple px-[18px] text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
                  >
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    {t("addSubmit")}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>

      {isExpanded ? (
        <p className="px-1 text-xs font-medium leading-4 text-gray-400">{t("addHint")}</p>
      ) : null}
    </div>
  );
}
