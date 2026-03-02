"use client";

import { useState } from "react";
import {
  Plus,
  RefreshCw,
  Package,
  AlertTriangle,
  CakeSlice,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PantryItemRow from "./PantryItemRow";
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

export default function PantrySection() {
  const t = useTranslations("pantry");
  const {
    items,
    itemsByCategory,
    expiringItems,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    refresh,
  } = usePantry();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

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

  const getCategoryLabel = (cat: string): string => {
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
    getCategoryLabel(a).localeCompare(getCategoryLabel(b)),
  );

  const filteredItems =
    activeFilter === "all"
      ? items
      : activeFilter === "expiring"
        ? expiringItems
        : (itemsByCategory[activeFilter] ?? []);

  const handleFilterChange = (filter: string) => {
    console.debug("[Pantry] filter changed", { from: activeFilter, to: filter, resultCount: 
      filter === "all" ? items.length :
      filter === "expiring" ? expiringItems.length :
      (itemsByCategory[filter] ?? []).length
    });
    setActiveFilter(filter);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CakeSlice className="w-7 h-7 text-eatrivo-purple" />
            {t("title")}
          </h1>
          <p className="text-gray-500 mt-1">
            {items.length === 0
              ? t("subtitle_empty")
              : t(items.length === 1 ? "subtitle_count_one" : items.length < 5 ? "subtitle_count_few" : "subtitle_count_many", { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="hidden sm:flex"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {t("refresh")}
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t("add_item")}
          </Button>
        </div>
      </div>

      {/* Expiry warning banner */}
      <AnimatePresence>
        {expiringItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {expiringItems.length === 1
                  ? t("expiry_warning_one")
                  : t("expiry_warning_few", { count: expiringItems.length })}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {expiringItems
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(", ")}
                {expiringItems.length > 3 &&
                  ` +${expiringItems.length - 3}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter chips */}
      {!isLoading && items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <FilterChip
            label={t("filter_all")}
            value="all"
            active={activeFilter === "all"}
            count={items.length}
            onClick={handleFilterChange}
          />
          {expiringItems.length > 0 && (
            <FilterChip
              label={t("filter_expiring")}
              value="expiring"
              active={activeFilter === "expiring"}
              count={expiringItems.length}
              onClick={handleFilterChange}
            />
          )}
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              label={getCategoryLabel(cat)}
              value={cat}
              active={activeFilter === cat}
              count={itemsByCategory[cat]?.length ?? 0}
              onClick={handleFilterChange}
            />
          ))}
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl w-full" />
          ))}
        </div>
      ) : filteredItems.length === 0 && items.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 bg-eatrivo-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-eatrivo-purple/50" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {t("empty_state_title")}
          </h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            {t("empty_state_description")}
          </p>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("add_first_item")}
          </Button>
        </motion.div>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">
          {t("no_items_in_category")}
        </p>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-1.5">
            {filteredItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Add item modal */}
      <AddPantryItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addItem}
      />
    </motion.div>
  );
}

// Helper chip component
function FilterChip({
  label,
  value,
  active,
  count,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  count: number;
  onClick: (value: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-eatrivo-purple text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1 py-0.5 rounded-full ${
          active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
