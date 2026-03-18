"use client";

import { useEffect, useState } from "react";
import { Loader2, Repeat2, Save } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PantryRestockItem } from "@/hooks/usePantry";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";

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
  quantity: string;
  unit: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function toDraftQuantity(value: string | null): string {
  return value ?? "";
}

function parseQuantity(value: string): number | null {
  if (!value.trim()) {
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
  const shouldReduceMotion = useReducedMotion();
  const triggerHaptic = useHapticFeedback();
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);
  const [pendingAddId, setPendingAddId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          {
            quantity: toDraftQuantity(item.defaultQuantity),
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-eatrivo-blue/10 rounded-lg">
            <Repeat2 className="w-5 h-5 text-eatrivo-blue" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">{t("restock.title")}</h2>
            <p className="text-sm text-gray-600">{t("restock.subtitle")}</p>
          </div>
        </div>

        <Badge className="rounded-full border-transparent bg-eatrivo-blue/10 text-eatrivo-blue">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            quantity: toDraftQuantity(item.defaultQuantity),
            unit: item.defaultUnit ?? "ks",
          };

          const hasChanges =
            draft.quantity !== toDraftQuantity(item.defaultQuantity) ||
            draft.unit !== (item.defaultUnit ?? "ks");

          return (
            <motion.article
              key={item.id}
              {...(shouldReduceMotion ? {} : fadeIn)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {item.name}
                    </h3>

                    <Badge className="rounded-full border-transparent bg-eatrivo-purple/10 text-eatrivo-purple">
                      {hasChanges ? t("restock.saveBadge") : t("restock.savedBadge")}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {t("restock.cardInstruction")}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem] lg:min-w-[23rem]">
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={draft.quantity}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...draft,
                          quantity: event.target.value,
                        },
                      }))
                    }
                    placeholder={t("field_quantity_placeholder")}
                    className="h-10 rounded-xl border-gray-200 bg-eatrivo-white-secondary"
                  />

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
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-eatrivo-white-secondary shadow-none">
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

                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingSaveId === item.id}
                    onClick={async () => {
                      setPendingSaveId(item.id);
                      try {
                        const success = await onUpdate(item.id, {
                          defaultQuantity: parseQuantity(draft.quantity),
                          defaultUnit: draft.unit,
                        });

                        if (success) {
                          triggerHaptic("success");
                        }
                      } finally {
                        setPendingSaveId(null);
                      }
                    }}
                    className="h-10 rounded-full border-gray-200 bg-white text-gray-700 hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple"
                  >
                    {pendingSaveId === item.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {t("restock.saveDefault")}
                  </Button>

                  <Button
                    type="button"
                    disabled={pendingAddId === item.id}
                    onClick={async () => {
                      setPendingAddId(item.id);
                      try {
                        const didUpdateDefaults = hasChanges
                          ? await onUpdate(item.id, {
                              defaultQuantity: parseQuantity(draft.quantity),
                              defaultUnit: draft.unit,
                            })
                          : true;

                        if (!didUpdateDefaults) {
                          return;
                        }

                        const success = await onQuickAdd(item.id, {
                          quantity: parseQuantity(draft.quantity),
                          unit: draft.unit,
                          mode: "replace",
                        });

                        if (success) {
                          triggerHaptic("success");
                        }
                      } finally {
                        setPendingAddId(null);
                      }
                    }}
                    className="h-10 rounded-full bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
                  >
                    {pendingAddId === item.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Repeat2 className="mr-2 h-4 w-4" />
                    )}
                    {t("restock.add_now")}
                  </Button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
