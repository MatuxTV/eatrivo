"use client";

import { useEffect, useState } from "react";
import { Loader2, Repeat2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PantryRestockItem } from "@/hooks/usePantry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";
import PantryQuantityWheel from "./PantryQuantityWheel";

interface PantryRestockStripProps {
  items: PantryRestockItem[];
  onQuickAdd: (
    id: string,
    overrides?: {
      quantity?: number | null;
      unit?: string | null;
      mode?: "merge" | "replace";
    },
  ) => Promise<boolean>;
  onUpdate: (
    id: string,
    updates: { defaultQuantity?: number | null; defaultUnit?: string | null },
  ) => Promise<boolean>;
}

interface DraftValue {
  quantity: number | null;
  unit: string;
}

function parseQuantity(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PantryRestockStrip({
  items,
  onQuickAdd,
  onUpdate,
}: PantryRestockStripProps) {
  const t = useTranslations("pantry");
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          {
            quantity: parseQuantity(item.defaultQuantity),
            unit: item.defaultUnit ?? "ks",
          },
        ]),
      ),
    );
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-eatrivo-purple/10 text-eatrivo-purple">
          <Repeat2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#1a1a2e]">
            {t("restock.title")}
          </h2>
          <p className="text-sm font-medium text-gray-500">
            {t("restock.subtitle")}
          </p>
        </div>
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:px-1">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            quantity: parseQuantity(item.defaultQuantity),
            unit: item.defaultUnit ?? "ks",
          };
          const hasChanges =
            draft.quantity !== parseQuantity(item.defaultQuantity) ||
            draft.unit !== (item.defaultUnit ?? "ks");

          return (
            <article
              key={item.id}
              className="w-[240px] shrink-0 rounded-[1.75rem] border border-eatrivo-purple/10 bg-gradient-to-br from-white via-white to-eatrivo-purple/5 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[15px] font-black leading-tight text-[#1a1a2e]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {t("restock.cardInstruction")}
                  </p>
                </div>
                <span className="rounded-full bg-eatrivo-purple/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-eatrivo-purple">
                  {draft.unit}
                </span>
              </div>

              <PantryQuantityWheel
                value={draft.quantity}
                unit={draft.unit}
                onChange={(quantity) =>
                  setDrafts((current) => ({
                    ...current,
                    [item.id]: { ...draft, quantity },
                  }))
                }
              />

              <div className="mt-3 flex items-center gap-2">
                <Select
                  value={draft.unit}
                  onValueChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: {
                        ...draft,
                        unit: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-20 rounded-full border border-gray-200 bg-white px-3 text-center text-xs font-bold uppercase tracking-wide text-gray-600 focus:ring-eatrivo-purple">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PANTRY_UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={async () => {
                    setSavingId(item.id);
                    const didUpdateDefaults = hasChanges
                      ? await onUpdate(item.id, {
                          defaultQuantity: draft.quantity,
                          defaultUnit: draft.unit,
                        })
                      : true;

                    if (didUpdateDefaults) {
                      await onQuickAdd(item.id, {
                        quantity: draft.quantity,
                        unit: draft.unit,
                        mode: "replace",
                      });
                    }

                    setSavingId(null);
                  }}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-600 transition-colors hover:border-eatrivo-purple hover:text-eatrivo-purple disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("restock.saveDefault")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}