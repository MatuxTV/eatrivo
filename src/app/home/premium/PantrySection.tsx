"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  Plus,
  RefreshCw,
  Package,
  AlertTriangle,
  CakeSlice,
  CheckCircle2,
  XCircle,
  Loader2,
  Milk,
  Beef,
  Apple,
  Carrot,
  Wheat,
  Egg,
  Droplets,
  CupSoda,
  Nut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PantryItemRow from "./PantryItemRow";
import PantryRestockStrip from "./PantryRestockStrip";
import AddPantryItemModal from "./AddPantryItemModal";
import { usePantry } from "@/hooks/usePantry";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

// Category key → i18n sub-key mapping
const CATEGORY_KEYS: Record<string, string> = {
  dairy: "dairy",
  meat_fish: "meat_fish",
  fruit: "fruit",
  vegetables: "vegetables",
  grains: "grains",
  eggs: "eggs",
  condiments: "condiments",
  beverages: "beverages",
  nuts_seeds: "nuts_seeds",
  other: "other",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  dairy: Milk,
  meat_fish: Beef,
  fruit: Apple,
  vegetables: Carrot,
  grains: Wheat,
  eggs: Egg,
  condiments: Droplets,
  beverages: CupSoda,
  nuts_seeds: Nut,
  other: Package,
};

interface PantrySectionProps {
  onPantryChanged?: () => void;
}

export default function PantrySection({
  onPantryChanged,
}: PantrySectionProps = {}) {
  const t = useTranslations("pantry");
  const locale = useLocale();
  const {
    items,
    restockItems,
    pendingDrafts,
    itemsByCategory,
    expiringItems,
    isLoading,
    isLoadingRestockItems,
    isPreparingDrafts,
    isConfirmingDrafts,
    addItem,
    addItemsBatch,
    updateItem,
    deleteItem,
    toggleRecurringForItem,
    updateRestockItem,
    quickAddRestockItem,
    confirmDrafts,
    discardDrafts,
    refresh,
  } = usePantry();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const recurringLookup = useMemo(() => {
    return new Map(
      items.map((item) => {
        const matchingRestock = restockItems.find((restockItem) => {
          if (
            item.ingredientSpecificKey &&
            restockItem.ingredientSpecificKey === item.ingredientSpecificKey
          ) {
            return true;
          }

          if (item.ingredientKey && restockItem.ingredientKey === item.ingredientKey) {
            return true;
          }

          return restockItem.name.trim().toLowerCase() === item.name.trim().toLowerCase();
        });

        return [item.id, matchingRestock];
      }),
    );
  }, [items, restockItems]);

  useEffect(() => {
    if (!isLoading) {
      console.debug("[PantrySection] notifying parent pantry summary refresh", {
        itemCount: items.length,
        expiringCount: expiringItems.length,
      });
      onPantryChanged?.();
    }
  }, [expiringItems.length, isLoading, items, onPantryChanged]);

  // Debug: log whenever items or loading state changes
  if (typeof window !== "undefined") {
    if (!isLoading) {
      console.debug("[Pantry] items loaded", {
        total: items.length,
        expiring: expiringItems.length,
        categories: Object.keys(itemsByCategory),
      });
    }
  }

  const getCategoryTranslation = (cat: string): string => {
    const key = CATEGORY_KEYS[cat];
    if (key) {
      try {
        return t(`categories.${key}` as Parameters<typeof t>[0]);
      } catch {
        return cat;
      }
    }
    return cat;
  };

  const categories = Object.keys(itemsByCategory).sort((a, b) =>
    getCategoryTranslation(a).localeCompare(getCategoryTranslation(b)),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto space-y-6 pb-24"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-[#1a1a2e] flex items-center gap-3 tracking-tighter mix-blend-multiply">
            <div className="w-14 h-14 rounded-full bg-eatrivo-purple/10 flex items-center justify-center shrink-0 shadow-inner">
              <CakeSlice className="w-7 h-7 text-eatrivo-purple" />
            </div>
            {t("title")}
          </h1>
          <p className="text-gray-500 mt-3 text-sm md:text-base font-medium max-w-lg">
            {items.length === 0
              ? t("subtitle_empty")
              : t(
                  items.length === 1
                    ? "subtitle_count_one"
                    : items.length < 5
                      ? "subtitle_count_few"
                      : "subtitle_count_many",
                  { count: items.length },
                )}
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar sm:overflow-visible pb-2 sm:pb-0">
          {pendingDrafts.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void discardDrafts()}
                disabled={isPreparingDrafts || isConfirmingDrafts}
                className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50 h-11 px-4 whitespace-nowrap active:scale-95 transition-transform"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                {locale === "sk" ? "Zrušiť zmeny" : "Discard changes"}
              </Button>
              <Button
                size="sm"
                onClick={() => void confirmDrafts()}
                disabled={isPreparingDrafts || isConfirmingDrafts}
                className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-5 shadow-lg shadow-emerald-500/20 whitespace-nowrap active:scale-95 transition-all"
              >
                {isPreparingDrafts || isConfirmingDrafts ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={3} />
                )}
                <span className="font-bold">
                  {locale === "sk" ? "Potvrdiť" : "Confirm"}
                </span>
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="hidden sm:flex rounded-full border-gray-200 text-gray-600 hover:text-eatrivo-purple hover:bg-eatrivo-purple/5 h-11 px-4 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            <span className="font-bold">{t("refresh")}</span>
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90 h-11 px-6 shadow-lg shadow-[#1a1a2e]/20 hover:scale-105 active:scale-95 transition-all duration-300 ease-out whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={3} />
            <span className="font-bold">{t("add_item")}</span>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {pendingDrafts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="rounded-[1.5rem] mt-2 border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 p-5 shadow-sm shadow-amber-500/5 mx-1"
          >
            <div className="flex items-center gap-2 text-amber-800 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-100/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold tracking-tight">
                {locale === "sk"
                  ? "Čakajúce položky na potvrdenie"
                  : "Pending items waiting for confirmation"}
              </p>
            </div>
            <div className="space-y-2">
              {pendingDrafts.map((draft) => (
                <div
                  key={draft.token}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[1.25rem] border border-amber-200/40 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm hover:border-amber-300/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-amber-950 truncate">
                        {draft.name}
                      </span>
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                        Draft
                      </span>
                    </div>
                    <p className="text-xs font-medium text-amber-700/70 mt-1">
                      {(draft.quantity
                        ? `${Number.parseFloat(draft.quantity).toLocaleString("sk-SK")} `
                        : "") + (draft.unit ?? "")}
                    </p>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600/60 whitespace-nowrap flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin hidden sm:block" />
                    {locale === "sk" ? "Čaká na potvrdenie" : "Waiting"}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expiry warning banner */}
      <AnimatePresence>
        {expiringItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="flex items-start gap-4 p-5 bg-gradient-to-r from-red-50 to-orange-50/50 border border-red-200/60 rounded-[1.5rem] shadow-sm shadow-red-500/5 mx-1"
          >
            <div className="w-10 h-10 rounded-full bg-red-100/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="mt-0.5">
              <p className="text-[15px] font-bold text-red-900 tracking-tight">
                {expiringItems.length === 1
                  ? t("expiry_warning_one")
                  : t("expiry_warning_few", { count: expiringItems.length })}
              </p>
              <p className="text-sm font-medium text-red-700/80 mt-1">
                {expiringItems
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(", ")}
                {expiringItems.length > 3 && ` +${expiringItems.length - 3}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="bg-white/60 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl shadow-eatrivo-purple/5 min-h-[400px]">
        {restockItems.length > 0 && !isLoadingRestockItems ? (
          <div className="mb-8">
            <PantryRestockStrip
              items={restockItems}
              onQuickAdd={quickAddRestockItem}
              onUpdate={updateRestockItem}
            />
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-full bg-white/50" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-40 w-[150px] shrink-0 rounded-[1.5rem] bg-white/50"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-48 rounded-full bg-white/50" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-40 w-[150px] shrink-0 rounded-[1.5rem] bg-white/50"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="text-center py-16 px-4 flex flex-col items-center justify-center h-full min-h-[300px]"
          >
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 bg-eatrivo-purple/10 rounded-full animate-ping opacity-75 duration-1000" />
              <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl shadow-eatrivo-purple/10 border border-eatrivo-purple/5">
                <Package className="w-12 h-12 text-eatrivo-purple/50" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-[#1a1a2e] mb-3 tracking-tight">
              {t("empty_state_title")}
            </h3>
            <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto mb-8 font-medium">
              {t("empty_state_description")}
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90 rounded-full px-8 py-6 shadow-xl shadow-eatrivo-purple/20 hover:scale-105 active:scale-95 transition-all duration-300 ease-out flex items-center gap-2"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              <span className="font-bold">{t("add_first_item")}</span>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-10">
            <AnimatePresence initial={false}>
              {/* Expiring Section (if applicable) */}
              {expiringItems.length > 0 && (
                <div className="space-y-4" key="expiring">
                  <h2 className="text-xl font-black flex items-center gap-2.5 text-[#1a1a2e] tracking-tight">
                    <div className="w-8 h-8 rounded-full bg-amber-100/50 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    {t("filter_expiring")}
                    <span className="ml-2 text-sm font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {expiringItems.length}
                    </span>
                  </h2>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-1">
                    {expiringItems.map((item) => {
                      const recurringItem = recurringLookup.get(item.id);

                      return (
                      <PantryItemRow
                        key={item.id}
                        item={item}
                        isRecurring={Boolean(recurringItem?.isActive)}
                        recurringItemId={recurringItem?.id}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onToggleRecurring={toggleRecurringForItem}
                      />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categorized Carousels */}
              {categories.map((cat) => {
                const catItems = itemsByCategory[cat];
                if (!catItems || catItems.length === 0) return null;
                const Icon = CATEGORY_ICONS[cat] || Package;

                return (
                  <div className="space-y-4" key={cat}>
                    <h2 className="text-xl font-black flex items-center gap-2.5 text-[#1a1a2e] tracking-tight">
                      <div className="w-8 h-8 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-eatrivo-purple" />
                      </div>
                      {getCategoryTranslation(cat)}
                      <span className="ml-2 text-sm font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {catItems.length}
                      </span>
                    </h2>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-1">
                      {catItems.map((item) => {
                        const recurringItem = recurringLookup.get(item.id);

                        return (
                        <PantryItemRow
                          key={item.id}
                          item={item}
                          isRecurring={Boolean(recurringItem?.isActive)}
                          recurringItemId={recurringItem?.id}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                          onToggleRecurring={toggleRecurringForItem}
                        />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add item modal */}
      <AddPantryItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItems={async (itemsToAdd) => {
          if (itemsToAdd.length === 1) {
            return addItem(itemsToAdd[0]);
          }

          return (await addItemsBatch(itemsToAdd)) !== null;
        }}
      />
    </motion.div>
  );
}
