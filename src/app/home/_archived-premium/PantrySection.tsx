"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CakeSlice,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePantry,
  type PantryItem,
  type PantryRestockItem,
} from "@/hooks/usePantry";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { guessFoodCategory } from "@/lib/units";
import { cn } from "@/lib/utils";
import AddPantryItemModal from "./AddPantryItemModal";
import PantryItemRow from "./PantryItemRow";

type FilterKey = "all" | "restock" | "expiring" | "manual" | "shopping_list";

const FILTERS: FilterKey[] = [
  "all",
  "restock",
  "expiring",
  "manual",
  "shopping_list",
];

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

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function getLocaleTag(locale: string): string {
  return locale === "sk" ? "sk-SK" : "en-US";
}

function normalizeLookupValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function formatCategoryFallback(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExpiry(expiryDate: string | null, locale: string): string | null {
  if (!expiryDate) {
    return null;
  }

  return new Date(expiryDate).toLocaleDateString(getLocaleTag(locale), {
    day: "numeric",
    month: "short",
  });
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) {
    return false;
  }

  return new Date(expiryDate).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}

function matchesSearch(
  query: string,
  itemName: string,
  itemCategory: string | null,
  categoryLabel: string,
): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalizeLookupValue(query);
  return [
    normalizeLookupValue(itemName),
    normalizeLookupValue(itemCategory),
    normalizeLookupValue(categoryLabel),
  ].some((value) => value.includes(normalizedQuery));
}

function matchesRestockIdentity(restockItem: PantryRestockItem, pantryItem: PantryItem): boolean {
  if (
    restockItem.ingredientSpecificKey &&
    restockItem.ingredientSpecificKey === pantryItem.ingredientSpecificKey
  ) {
    return true;
  }

  if (restockItem.ingredientKey && restockItem.ingredientKey === pantryItem.ingredientKey) {
    return true;
  }

  return normalizeLookupValue(restockItem.name) === normalizeLookupValue(pantryItem.name);
}

function getQuantityDeltaForUnit(unit: string | null): number {
  switch ((unit ?? "").toLowerCase()) {
    case "g":
    case "ml":
      return 50;
    case "kg":
    case "l":
      return 0.1;
    case "dl":
    case "tsp":
    case "tbsp":
      return 0.5;
    case "ks":
    default:
      return 1;
  }
}

function PantryLoadingState() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-48 rounded-xl bg-eatrivo-purple/10" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full bg-gray-200" />
              <Skeleton className="h-7 w-24 rounded-full bg-gray-200" />
            </div>
            <Skeleton className="h-4 w-72 rounded-full bg-gray-200" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-full bg-gray-200" />
            <Skeleton className="h-11 w-32 rounded-full bg-eatrivo-purple/10" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-3">
        <Skeleton className="h-6 w-36 rounded-full bg-gray-200" />
        {[...Array(2)].map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-4">
        <Skeleton className="h-11 rounded-2xl bg-gray-100" />
        <div className="flex gap-2 overflow-hidden">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-24 rounded-full bg-gray-100" />
          ))}
        </div>
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone = "purple",
}: {
  label: string;
  value: string;
  tone?: "purple" | "red";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        tone === "red"
          ? "border-eatrivo-red/20 bg-eatrivo-red/10"
          : "border-eatrivo-purple/20 bg-eatrivo-purple/10",
      )}
    >
      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          tone === "red" ? "text-eatrivo-red" : "text-eatrivo-purple",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
        active
          ? "border-eatrivo-purple bg-eatrivo-purple text-white"
          : "border-gray-200 bg-white text-gray-600 hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple",
      )}
    >
      {label}
    </button>
  );
}

function SectionStateCard({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 text-center">
      <div className="mx-auto w-fit p-2 bg-eatrivo-blue/10 rounded-lg text-eatrivo-blue">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

interface PantrySectionProps {
  onPantryChanged?: () => void;
}

export default function PantrySection({
  onPantryChanged,
}: PantrySectionProps = {}) {
  const t = useTranslations("pantry");
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotion();
  const triggerHaptic = useHapticFeedback();
  const {
    items,
    restockItems,
    pendingDrafts,
    expiringItems,
    isLoading,
    isPreparingDrafts,
    isConfirmingDrafts,
    error,
    addItem,
    addItemsBatch,
    updateItem,
    stepItemQuantity,
    deleteItem,
    addItemToShoppingList,
    toggleRecurringForItem,
    confirmDrafts,
    discardDrafts,
    refresh,
  } = usePantry();

  const [isMounted, setIsMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [pendingQuantityId, setPendingQuantityId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRecurringId, setPendingRecurringId] = useState<string | null>(null);
  const [pendingAddPackageId, setPendingAddPackageId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading) {
      onPantryChanged?.();
    }
  }, [expiringItems.length, isLoading, isMounted, items.length, onPantryChanged]);

  const filterLabels = useMemo(
    () => ({
      all: t("filter_all"),
      restock: t("filter_restock"),
      expiring: t("filter_expiring"),
      manual: t("filter_manual"),
      shopping_list: t("filter_shopping_list"),
    }),
    [t],
  );

  const categoryLabels = useMemo(
    () => ({
      dairy: t("categories.dairy"),
      meat_fish: t("categories.meat_fish"),
      fruit: t("categories.fruit"),
      vegetables: t("categories.vegetables"),
      grains: t("categories.grains"),
      eggs: t("categories.eggs"),
      condiments: t("categories.condiments"),
      beverages: t("categories.beverages"),
      nuts_seeds: t("categories.nuts_seeds"),
      other: t("categories.other"),
    }),
    [t],
  );

  const recurringLookup = useMemo(() => {
    return new Map(
      items.map((item) => {
        const matchingRestock = restockItems.find((restockItem) =>
          matchesRestockIdentity(restockItem, item),
        );

        return [item.id, matchingRestock];
      }),
    );
  }, [items, restockItems]);

  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>(Object.keys(CATEGORY_KEYS));

    for (const item of items) {
      categorySet.add(item.category ?? guessFoodCategory(item.name));
    }

    for (const restockItem of restockItems) {
      categorySet.add(restockItem.category ?? guessFoodCategory(restockItem.name));
    }

    return [...categorySet].sort((left, right) => {
      const leftLabel =
        categoryLabels[left as keyof typeof categoryLabels] ?? formatCategoryFallback(left);
      const rightLabel =
        categoryLabels[right as keyof typeof categoryLabels] ?? formatCategoryFallback(right);

      return leftLabel.localeCompare(rightLabel, locale);
    });
  }, [categoryLabels, items, locale, restockItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const category = item.category ?? guessFoodCategory(item.name);
      const categoryLabel =
        categoryLabels[category as keyof typeof categoryLabels] ??
        formatCategoryFallback(category);

      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const matchesText = matchesSearch(searchQuery, item.name, category, categoryLabel);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "restock" && item.lowStock) ||
        (activeFilter === "expiring" && isExpiringSoon(item.expiryDate)) ||
        (activeFilter === "manual" && item.source === "manual") ||
        (activeFilter === "shopping_list" && item.source === "shopping_list");

      return matchesCategory && matchesText && matchesFilter;
    });
  }, [activeFilter, categoryFilter, categoryLabels, items, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups = filteredItems.reduce<Record<string, PantryItem[]>>((accumulator, item) => {
      const category = item.category ?? guessFoodCategory(item.name);
      if (!accumulator[category]) {
        accumulator[category] = [];
      }

      accumulator[category].push(item);
      return accumulator;
    }, {});

    return Object.entries(groups).sort(([leftKey], [rightKey]) => {
      const leftLabel =
        categoryLabels[leftKey as keyof typeof categoryLabels] ??
        formatCategoryFallback(leftKey);
      const rightLabel =
        categoryLabels[rightKey as keyof typeof categoryLabels] ??
        formatCategoryFallback(rightKey);

      return leftLabel.localeCompare(rightLabel, locale);
    });
  }, [categoryLabels, filteredItems, locale]);

  useEffect(() => {
    setExpandedCategories((current) => {
      const next = { ...current };

      for (const [category] of groupedItems) {
        if (!(category in next)) {
          next[category] = false;
        }
      }

      for (const category of Object.keys(next)) {
        if (!groupedItems.some(([groupCategory]) => groupCategory === category)) {
          delete next[category];
        }
      }

      return next;
    });
  }, [groupedItems]);

  const headerSubtitle =
    items.length === 0
      ? t("subtitle_empty")
      : t(
          items.length === 1
            ? "subtitle_count_one"
            : items.length < 5
              ? "subtitle_count_few"
              : "subtitle_count_many",
          { count: items.length },
        );

  async function handleRefresh() {
    await refresh();
    triggerHaptic("light");
  }

  async function handleConfirmDrafts() {
    const success = await confirmDrafts();
    if (success) {
      triggerHaptic("success");
    }
  }

  async function handleDiscardDrafts() {
    const success = await discardDrafts();
    if (success) {
      triggerHaptic("light");
    }
  }

  async function handleQuantityChange(
    item: PantryItem,
    operation: "increment" | "decrement",
  ) {
    if (pendingQuantityId) {
      return;
    }

    setPendingQuantityId(item.id);
    try {
      const success = await stepItemQuantity(
        item.id,
        operation,
        getQuantityDeltaForUnit(item.unit),
      );

      if (success) {
        triggerHaptic("light");
      }
    } finally {
      setPendingQuantityId(null);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setPendingDeleteId(itemId);
    try {
      const success = await deleteItem(itemId);
      if (success) {
        triggerHaptic("medium");
      }
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handleToggleRecurring(
    item: PantryItem,
    enabled: boolean,
    restockItemId?: string,
  ) {
    setPendingRecurringId(item.id);
    try {
      const success = await toggleRecurringForItem(item, enabled, restockItemId);
      if (success) {
        triggerHaptic("medium");
      }
    } finally {
      setPendingRecurringId(null);
    }
  }

  async function handleAddPackage(item: PantryItem): Promise<void> {
    if (!item.supportsRestockPackage || pendingAddPackageId) {
      return;
    }

    setPendingAddPackageId(item.id);
    try {
      const success = await addItemToShoppingList(item.id, {
        appendPackage: true,
      });

      if (success) {
        triggerHaptic("light");
      }
    } finally {
      setPendingAddPackageId(null);
    }
  }

  async function handleItemEdit(
    itemId: string,
    updates: { quantity: number | null; unit: string | null },
  ): Promise<boolean> {
    const success = await updateItem(itemId, updates);
    if (success) {
      triggerHaptic("medium");
    }

    return success;
  }

  async function handleAvailabilityToggle(item: PantryItem): Promise<void> {
    const success = await updateItem(item.id, {
      trackingMode: "availability",
      inStock: !item.inStock,
    });

    if (success) {
      triggerHaptic("medium");
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setActiveFilter("all");
    triggerHaptic("light");
  }

  function toggleCategory(category: string) {
    setExpandedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
    triggerHaptic("light");
  }

  return (
    <AnimatePresence mode="wait">
      {!isMounted || isLoading ? (
        <motion.div
          key="loading"
          {...(shouldReduceMotion ? {} : fadeIn)}
        >
          <PantryLoadingState />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          {...(shouldReduceMotion ? {} : fadeIn)}
          className="max-w-5xl mx-auto space-y-6 pb-24"
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="p-2 bg-eatrivo-purple/10 rounded-lg">
                      <CakeSlice className="w-5 h-5 text-eatrivo-purple" />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {t("title")}
                    </h1>

                    <StatChip label={t("summary_inventory")} value={String(items.length)} />
                    {expiringItems.length > 0 ? (
                      <StatChip
                        label={t("summary_expiring")}
                        value={String(expiringItems.length)}
                        tone="red"
                      />
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-600 max-w-2xl">{headerSubtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleRefresh()}
                  className="rounded-full border-eatrivo-black-secondary/60 border-1 bg-white text-gray-700 hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("refresh")}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsAddModalOpen(true);
                  }}
                  className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("add_item")}
                </Button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {pendingDrafts.length > 0 ? (
              <motion.section
                key="drafts"
                {...(shouldReduceMotion ? {} : fadeIn)}
                className="bg-white rounded-2xl border border-eatrivo-orange/20 shadow-sm p-4 md:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-transparent bg-eatrivo-orange/10 text-eatrivo-orange">
                        {t("drafts_badge")}
                      </Badge>
                      <p className="text-lg font-semibold text-gray-900">
                        {t("drafts_title")}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t("drafts_description", { count: pendingDrafts.length })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleDiscardDrafts()}
                      disabled={isPreparingDrafts || isConfirmingDrafts}
                      className="rounded-full border-eatrivo-black-secondary bg-white text-gray-700"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("drafts_discard")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleConfirmDrafts()}
                      disabled={isPreparingDrafts || isConfirmingDrafts}
                      className="bg-eatrivo-green hover:bg-eatrivo-green/90 text-white rounded-full px-6"
                    >
                      {isConfirmingDrafts ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {t("drafts_confirm")}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {pendingDrafts.map((draft) => (
                    <div
                      key={draft.token}
                      className="min-w-[12rem] rounded-2xl border border-gray-100 bg-eatrivo-white-secondary px-3 py-3"
                    >
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {draft.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {draft.quantity ? `${draft.quantity}${draft.unit ? ` ${draft.unit}` : ""}` : draft.unit ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {expiringItems.length > 0 ? (
              <motion.section
                key="expiring-banner"
                {...(shouldReduceMotion ? {} : fadeIn)}
                className="bg-white rounded-2xl border border-eatrivo-red/20 shadow-sm p-4 md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-eatrivo-red/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-eatrivo-red" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-gray-900">
                      {expiringItems.length === 1
                        ? t("expiry_warning_one")
                        : t("expiry_warning_few", { count: expiringItems.length })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {expiringItems
                        .slice(0, 4)
                        .map((item) => item.name)
                        .join(", ")}
                      {expiringItems.length > 4 ? ` +${expiringItems.length - 4}` : ""}
                    </p>
                  </div>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          {/* <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            {isLoadingRestockItems ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : restockItems.length > 0 ? (
              <PantryRestockStrip
                items={restockItems}
                onQuickAdd={quickAddRestockItem}
                onUpdate={updateRestockItem}
              />
            ) : (
              <SectionStateCard
                title={t("restock.empty_title")}
                description={t("restock.empty_description")}
                icon={<Sparkles className="w-5 h-5" />}
              />
            )}
          </div> */}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t("inventory_title")}</h2>
                <p className="text-sm text-gray-600">{t("inventory_description")}</p>
              </div>

              <Badge className="rounded-full border-transparent bg-eatrivo-purple/10 text-eatrivo-purple">
                {filteredItems.length}
              </Badge>
            </div>

            <div className=" top-0 z-10 p-2 rounded-3xl bg-eatrivo-white-primary border-1 border-eatrivo-black-secondary/40 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("search_placeholder")}
                  className="h-11 rounded-2xl border-gray-200 bg-eatrivo-white-secondary pl-11"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((filter) => (
                  <FilterChip
                    key={filter}
                    active={activeFilter === filter}
                    label={filterLabels[filter]}
                    onClick={() => {
                      if (activeFilter !== filter) {
                        triggerHaptic("light");
                      }
                      setActiveFilter(filter);
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    if (value !== categoryFilter) {
                      triggerHaptic("light");
                    }
                    setCategoryFilter(value);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-eatrivo-white-secondary shadow-none">
                    <SelectValue placeholder={t("category_filter_label")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("category_filter_all")}</SelectItem>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryLabels[category as keyof typeof categoryLabels] ??
                          formatCategoryFallback(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(activeFilter !== "all" ||
                  categoryFilter !== "all" ||
                  searchQuery.trim().length > 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="rounded-full border-gray-200 bg-white text-gray-700"
                  >
                    {t("clear_filters")}
                  </Button>
                )}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-eatrivo-red/20 bg-eatrivo-red/10 px-4 py-3 text-sm text-eatrivo-red">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{t("load_error_title")}</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {items.length === 0 ? (
              <SectionStateCard
                title={t("empty_state_title")}
                description={t("empty_state_description")}
                icon={<Package className="w-5 h-5" />}
                action={
                  <Button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsAddModalOpen(true);
                    }}
                    className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("add_first_item")}
                  </Button>
                }
              />
            ) : groupedItems.length > 0 ? (
              <div className="space-y-6">
                {groupedItems.map(([category, categoryItems]) => {
                  const categoryLabel =
                    categoryLabels[category as keyof typeof categoryLabels] ??
                    formatCategoryFallback(category);
                  const isExpanded = expandedCategories[category] ?? true;

                  return (
                    <section key={category} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-eatrivo-blue/10 rounded-lg">
                            <Package className="w-5 h-5 text-eatrivo-blue" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {categoryLabel}
                            </h3>
                            <p className="text-xs text-gray-500">{categoryItems.length}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-eatrivo-blue/10 hover:text-eatrivo-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                          aria-label={
                            isExpanded
                              ? t("aria_collapse_category", { category: categoryLabel })
                              : t("aria_expand_category", { category: categoryLabel })
                          }
                          aria-expanded={isExpanded}
                          title={
                            isExpanded
                              ? t("aria_collapse_category", { category: categoryLabel })
                              : t("aria_expand_category", { category: categoryLabel })
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            key={`${category}-items`}
                            initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                            animate={
                              shouldReduceMotion
                                ? undefined
                                : { opacity: 1, height: "auto" }
                            }
                            exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            {categoryItems.map((item) => {
                              const recurringItem = recurringLookup.get(item.id);

                              return (
                                <PantryItemRow
                                  key={item.id}
                                  item={item}
                                  locale={locale}
                                  categoryLabel={categoryLabel}
                                  expiryLabel={formatExpiry(item.expiryDate, locale)}
                                  isExpiring={isExpiringSoon(item.expiryDate)}
                                  isLowStock={item.lowStock}
                                  isRecurring={Boolean(recurringItem?.isActive)}
                                  isPendingQuantity={pendingQuantityId === item.id}
                                  isPendingDelete={pendingDeleteId === item.id}
                                  isPendingRecurring={pendingRecurringId === item.id}
                                  sourceLabel={
                                    item.source === "shopping_list"
                                      ? t("source_shopping_list")
                                      : t("source_manual")
                                  }
                                  lowStockLabel={t("row_low_stock")}
                                  expiringLabel={t("row_expiring")}
                                  recurringLabel={
                                    recurringItem?.isActive ? t("row_tracked") : t("row_track")
                                  }
                                  editLabel={t("aria_edit")}
                                  saveLabel={t("save_changes")}
                                  cancelLabel={t("cancel")}
                                  quantityLabel={t("field_quantity")}
                                  unitLabel={t("field_unit")}
                                  quantityPlaceholder={t("field_quantity_placeholder")}
                                  unitPlaceholder={t("field_unit")}
                                  quantityCaption={t("field_quantity")}
                                  availabilityCaption={t("field_availability")}
                                  availableLabel={t("availability_in_stock")}
                                  unavailableLabel={t("availability_out_of_stock")}
                                  toggleAvailabilityLabel={t("toggle_availability")}
                                  decreaseLabel={t("aria_decrease")}
                                  increaseLabel={t("aria_increase")}
                                  deleteLabel={t("aria_delete")}
                                  addPackageLabel={t("row_add_package_label")}
                                  addPackageCtaLabel={t("row_add_package")}
                                  addPackagePendingLabel={t("row_add_package_pending")}
                                  addPackageReadyLabel={t("row_add_package_again")}
                                  showAddPackageAction={item.supportsRestockPackage}
                                  isPendingAddPackage={pendingAddPackageId === item.id}
                                  onIncrease={() => void handleQuantityChange(item, "increment")}
                                  onDecrease={() => void handleQuantityChange(item, "decrement")}
                                  onDelete={() => void handleDeleteItem(item.id)}
                                  onSaveEdit={(updates) => handleItemEdit(item.id, updates)}
                                  onToggleAvailability={() => void handleAvailabilityToggle(item)}
                                  onToggleRecurring={() =>
                                    void handleToggleRecurring(
                                      item,
                                      !recurringItem?.isActive,
                                      recurringItem?.id,
                                    )
                                  }
                                  onAddPackage={() => void handleAddPackage(item)}
                                />
                              );
                            })}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </section>
                  );
                })}
              </div>
            ) : (
              <SectionStateCard
                title={t("no_results_title")}
                description={t("no_results_description")}
                icon={<Search className="w-5 h-5" />}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="rounded-full border-gray-200 bg-white text-gray-700"
                  >
                    {t("clear_filters")}
                  </Button>
                }
              />
            )}
          </div>

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
      )}
    </AnimatePresence>
  );
}
