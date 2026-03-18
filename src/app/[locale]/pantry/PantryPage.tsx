"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  Package2,
  Pin,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePantry, type PantryItem, type PantryRestockItem } from "@/hooks/usePantry";
import { PANTRY_UNIT_OPTIONS, guessFoodCategory, toCanonicalQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "restock" | "expiring" | "manual" | "shopping_list";

type RestockInsight = {
  restockItem: PantryRestockItem;
  pantryItem: PantryItem | null;
  currentQuantity: number | null;
  targetQuantity: number | null;
  missingQuantity: number | null;
  unit: string | null;
  needsRestock: boolean;
};

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

function getLocaleTag(locale: string): string {
  return locale === "sk" ? "sk-SK" : "en-US";
}

function parseStoredNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLookupValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function formatCategoryFallback(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumericValue(value: number, locale: string): string {
  return value.toLocaleString(getLocaleTag(locale), {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function formatQuantity(
  quantity: number | string | null | undefined,
  unit: string | null | undefined,
  locale: string,
): string {
  const parsed =
    typeof quantity === "number" ? quantity : parseStoredNumber(quantity ?? null);

  if (parsed === null) {
    return unit ? unit : "—";
  }

  return `${formatNumericValue(parsed, locale)}${unit ? ` ${unit}` : ""}`;
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) {
    return false;
  }

  const expiryTime = new Date(expiryDate).getTime();
  const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
  return expiryTime <= threeDaysFromNow;
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

function getRestockComparison(
  targetQuantity: number | null,
  targetUnit: string | null,
  currentQuantity: number | null,
  currentUnit: string | null,
): { needsRestock: boolean; missingInTargetUnit: number | null } {
  if (targetQuantity === null) {
    return {
      needsRestock: currentQuantity === null || currentQuantity <= 0,
      missingInTargetUnit: null,
    };
  }

  if (currentQuantity === null) {
    return {
      needsRestock: true,
      missingInTargetUnit: targetQuantity,
    };
  }

  if (targetUnit && currentUnit) {
    const targetCanonical = toCanonicalQuantity(targetQuantity, targetUnit);
    const currentCanonical = toCanonicalQuantity(currentQuantity, currentUnit);
    const targetUnitFactor = toCanonicalQuantity(1, targetUnit);

    if (
      targetCanonical &&
      currentCanonical &&
      targetUnitFactor &&
      targetCanonical.dimension === currentCanonical.dimension
    ) {
      const missingCanonical = Math.max(0, targetCanonical.value - currentCanonical.value);

      return {
        needsRestock: currentCanonical.value < targetCanonical.value,
        missingInTargetUnit: missingCanonical / targetUnitFactor.value,
      };
    }

    if (targetUnit === currentUnit) {
      return {
        needsRestock: currentQuantity < targetQuantity,
        missingInTargetUnit: Math.max(0, targetQuantity - currentQuantity),
      };
    }

    return {
      needsRestock: false,
      missingInTargetUnit: null,
    };
  }

  if (!targetUnit && !currentUnit) {
    return {
      needsRestock: currentQuantity < targetQuantity,
      missingInTargetUnit: Math.max(0, targetQuantity - currentQuantity),
    };
  }

  return {
    needsRestock: false,
    missingInTargetUnit: null,
  };
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
    <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 px-5 py-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f8efe3] text-[#8b5e3c]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold tracking-tight text-[#1f1d1a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f2eb]">
      <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-24 rounded-full bg-[#eadfce]" />
          <Skeleton className="h-10 w-56 rounded-2xl bg-[#eadfce]" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, index) => (
              <Skeleton
                key={index}
                className="h-20 rounded-[1.5rem] bg-white/80"
              />
            ))}
          </div>
        </div>

        <div className="sticky top-0 z-20 mt-5 space-y-3 border-b border-stone-200 bg-[#f7f2eb]/95 py-4 backdrop-blur">
          <Skeleton className="h-11 rounded-2xl bg-white/90" />
          <div className="flex gap-2 overflow-hidden">
            {[...Array(4)].map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-24 shrink-0 rounded-full bg-white/90"
              />
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {[...Array(6)].map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 rounded-[1.75rem] bg-white/90"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PantryPage() {
  const t = useTranslations("pantry");
  const locale = useLocale();
  const {
    items,
    restockItems,
    pendingDrafts,
    expiringItems,
    isLoading,
    isLoadingRestockItems,
    isPreparingDrafts,
    isConfirmingDrafts,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleRecurringForItem,
    quickAddRestockItem,
    confirmDrafts,
    discardDrafts,
    refresh,
  } = usePantry();

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddQuantity, setQuickAddQuantity] = useState("");
  const [quickAddUnit, setQuickAddUnit] = useState("ks");
  const [quickAddCategory, setQuickAddCategory] = useState("other");
  const [pendingQuantityId, setPendingQuantityId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRecurringId, setPendingRecurringId] = useState<string | null>(null);
  const [pendingRestockActionId, setPendingRestockActionId] = useState<string | null>(null);
  const [pendingShoppingListId, setPendingShoppingListId] = useState<string | null>(null);

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

  const restockInsights = useMemo<RestockInsight[]>(() => {
    return restockItems
      .map((restockItem) => {
        const pantryItem =
          items.find((item) => matchesRestockIdentity(restockItem, item)) ?? null;
        const targetQuantity = parseStoredNumber(restockItem.defaultQuantity);
        const currentQuantity = parseStoredNumber(pantryItem?.quantity ?? null);
        const comparison = getRestockComparison(
          targetQuantity,
          restockItem.defaultUnit ?? null,
          currentQuantity,
          pantryItem?.unit ?? null,
        );

        const needsRestock = !pantryItem || comparison.needsRestock;
        const missingQuantity = !pantryItem
          ? targetQuantity
          : comparison.missingInTargetUnit;

        return {
          restockItem,
          pantryItem,
          currentQuantity,
          targetQuantity,
          missingQuantity,
          unit: restockItem.defaultUnit ?? pantryItem?.unit ?? null,
          needsRestock,
        };
      })
      .sort((left, right) => {
        if (left.needsRestock !== right.needsRestock) {
          return left.needsRestock ? -1 : 1;
        }

        if (left.pantryItem && !right.pantryItem) {
          return 1;
        }

        if (!left.pantryItem && right.pantryItem) {
          return -1;
        }

        return left.restockItem.name.localeCompare(right.restockItem.name, locale);
      });
  }, [items, locale, restockItems]);

  const lowStockItemIds = useMemo(
    () =>
      new Set(
        restockInsights
          .filter((insight) => insight.needsRestock && insight.pantryItem)
          .map((insight) => insight.pantryItem!.id),
      ),
    [restockInsights],
  );

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

  const filteredRestockItems = useMemo(() => {
    if (activeFilter !== "all" && activeFilter !== "restock") {
      return [];
    }

    return restockInsights.filter((insight) => {
      if (!insight.needsRestock) {
        return false;
      }

      const category = insight.restockItem.category ?? guessFoodCategory(insight.restockItem.name);
      const categoryLabel =
        categoryLabels[category as keyof typeof categoryLabels] ?? formatCategoryFallback(category);

      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const matchesText = matchesSearch(
        searchQuery,
        insight.restockItem.name,
        category,
        categoryLabel,
      );

      return matchesCategory && matchesText;
    });
  }, [activeFilter, categoryFilter, categoryLabels, restockInsights, searchQuery]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const category = item.category ?? guessFoodCategory(item.name);
      const categoryLabel =
        categoryLabels[category as keyof typeof categoryLabels] ?? formatCategoryFallback(category);

      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const matchesText = matchesSearch(searchQuery, item.name, category, categoryLabel);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "restock" && lowStockItemIds.has(item.id)) ||
        (activeFilter === "expiring" && isExpiringSoon(item.expiryDate)) ||
        (activeFilter === "manual" && item.source === "manual") ||
        (activeFilter === "shopping_list" && item.source === "shopping_list");

      return matchesCategory && matchesText && matchesFilter;
    });
  }, [activeFilter, categoryFilter, categoryLabels, items, lowStockItemIds, searchQuery]);

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
  }

  async function handleQuantityChange(item: PantryItem, delta: number) {
    if (pendingQuantityId) {
      return;
    }

    const currentValue = parseStoredNumber(item.quantity) ?? 0;
    const nextValue = Math.max(0, currentValue + delta);

    if (delta < 0 && currentValue <= 0) {
      return;
    }

    setPendingQuantityId(item.id);
    try {
      await updateItem(item.id, {
        quantity: nextValue,
        unit: item.unit ?? null,
      });
    } finally {
      setPendingQuantityId(null);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setPendingDeleteId(itemId);
    try {
      await deleteItem(itemId);
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handleToggleRecurring(item: PantryItem, enabled: boolean, restockItemId?: string) {
    setPendingRecurringId(item.id);
    try {
      await toggleRecurringForItem(item, enabled, restockItemId);
    } finally {
      setPendingRecurringId(null);
    }
  }

  async function handleRestockFill(insight: RestockInsight) {
    setPendingRestockActionId(insight.restockItem.id);
    try {
      const quantityOverride =
        insight.missingQuantity !== null && insight.missingQuantity > 0
          ? insight.missingQuantity
          : undefined;

      await quickAddRestockItem(insight.restockItem.id, {
        quantity: quantityOverride,
        unit: insight.unit,
        mode: "merge",
      });
    } finally {
      setPendingRestockActionId(null);
    }
  }

  async function handleSendToShoppingList(insight: RestockInsight) {
    setPendingShoppingListId(insight.restockItem.id);
    try {
      const quantityForList =
        insight.missingQuantity !== null && insight.missingQuantity > 0
          ? insight.missingQuantity
          : insight.targetQuantity;

      const amountLabel =
        quantityForList !== null || insight.unit
          ? formatQuantity(quantityForList, insight.unit, locale)
          : null;

      const response = await fetch("/api/shopping-lists/current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: insight.restockItem.name,
          amountLabel,
          category:
            insight.restockItem.category ??
            insight.pantryItem?.category ??
            guessFoodCategory(insight.restockItem.name),
        }),
      });

      if (!response.ok) {
        toast.error(t("shopping_list_error"));
        return;
      }

      toast.success(t("shopping_list_success"));
    } catch {
      toast.error(t("shopping_list_error"));
    } finally {
      setPendingShoppingListId(null);
    }
  }

  async function handleQuickAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = quickAddName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmittingQuickAdd(true);
    try {
      const success = await addItem({
        name: trimmedName,
        quantity: quickAddQuantity ? Number.parseFloat(quickAddQuantity) : null,
        unit: quickAddQuantity ? quickAddUnit : null,
        category: quickAddCategory || guessFoodCategory(trimmedName),
      });

      if (!success) {
        return;
      }

      setQuickAddName("");
      setQuickAddQuantity("");
      setQuickAddUnit("ks");
      setQuickAddCategory("other");
      setIsAddSheetOpen(false);
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setActiveFilter("all");
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f2eb] text-[#1f1d1a]">
      <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6">
        <header className="space-y-4">
          <Badge className="rounded-full border-0 bg-[#eadcc7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b5e3c]">
            {t("eyebrow")}
          </Badge>

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-[#1f1d1a] sm:text-4xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
              {headerSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SummaryCard
              label={t("summary_inventory")}
              value={String(items.length)}
              tone="neutral"
            />
            <SummaryCard
              label={t("summary_restock")}
              value={String(restockInsights.filter((item) => item.needsRestock).length)}
              tone="warm"
            />
            <SummaryCard
              label={t("summary_expiring")}
              value={String(expiringItems.length)}
              tone="alert"
            />
          </div>
        </header>

        <div className="sticky top-0 z-30 mt-5 -mx-4 border-b border-stone-200 bg-[#f7f2eb]/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("search_placeholder")}
              className="h-11 rounded-2xl border-stone-200 bg-white pl-11 shadow-none"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => (
              <FilterChip
                key={filter}
                active={activeFilter === filter}
                label={filterLabels[filter]}
                onClick={() => setActiveFilter(filter)}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white shadow-none">
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

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void handleRefresh()}
              className="h-10 w-10 shrink-0 rounded-xl border-stone-200 bg-white text-stone-600 shadow-none hover:bg-stone-50"
              aria-label={t("refresh")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{t("load_error_title")}</p>
                  <p className="mt-1 text-red-600">{error}</p>
                </div>
              </div>
            </div>
          ) : null}

          {pendingDrafts.length > 0 ? (
            <section className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full border-0 bg-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
                      {t("drafts_badge")}
                    </Badge>
                    <span className="text-sm font-semibold text-amber-900">
                      {t("drafts_title")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-amber-800/85">
                    {t("drafts_description", { count: pendingDrafts.length })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void discardDrafts()}
                    disabled={isPreparingDrafts || isConfirmingDrafts}
                    className="rounded-full border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    {t("drafts_discard")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void confirmDrafts()}
                    disabled={isPreparingDrafts || isConfirmingDrafts}
                    className="rounded-full bg-amber-900 text-white hover:bg-amber-950"
                  >
                    {isConfirmingDrafts ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    )}
                    {t("drafts_confirm")}
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {pendingDrafts.map((draft) => (
                  <div
                    key={draft.token}
                    className="min-w-[13rem] rounded-2xl border border-amber-200 bg-white px-3 py-3"
                  >
                    <p className="truncate text-sm font-semibold text-[#1f1d1a]">
                      {draft.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatQuantity(draft.quantity, draft.unit, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#1f1d1a]">
                  {t("restock.section_title")}
                </h2>
                <p className="text-sm text-stone-500">{t("restock.section_subtitle")}</p>
              </div>
              {isLoadingRestockItems ? (
                <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
              ) : null}
            </div>

            {isLoadingRestockItems ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-24 rounded-[1.75rem] bg-white/90"
                  />
                ))}
              </div>
            ) : filteredRestockItems.length > 0 ? (
              <div className="space-y-3">
                {filteredRestockItems.map((insight) => {
                  const category =
                    insight.restockItem.category ?? guessFoodCategory(insight.restockItem.name);
                  const categoryLabel =
                    categoryLabels[category as keyof typeof categoryLabels] ??
                    formatCategoryFallback(category);

                  return (
                    <RestockRow
                      key={insight.restockItem.id}
                      locale={locale}
                      categoryLabel={categoryLabel}
                      insight={insight}
                      addLabel={t("restock.add_now")}
                      shoppingLabel={t("restock.add_to_list")}
                      currentLabel={t("restock.current")}
                      targetLabel={t("restock.target")}
                      missingLabel={t("restock.missing")}
                      pendingAction={pendingRestockActionId === insight.restockItem.id}
                      pendingShopping={pendingShoppingListId === insight.restockItem.id}
                      onAddNow={() => void handleRestockFill(insight)}
                      onAddToShopping={() => void handleSendToShoppingList(insight)}
                    />
                  );
                })}
              </div>
            ) : (
              <SectionStateCard
                title={t("restock.empty_title")}
                description={t("restock.empty_description")}
                icon={<Sparkles className="h-5 w-5" />}
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#1f1d1a]">
                  {t("inventory_title")}
                </h2>
                <p className="text-sm text-stone-500">{t("inventory_description")}</p>
              </div>
              <Badge className="rounded-full border-0 bg-white px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                {filteredItems.length}
              </Badge>
            </div>

            {items.length === 0 ? (
              <SectionStateCard
                title={t("empty_state_title")}
                description={t("empty_state_description")}
                icon={<Package2 className="h-5 w-5" />}
                action={
                  <Button
                    type="button"
                    onClick={() => setIsAddSheetOpen(true)}
                    className="rounded-full bg-[#1f1d1a] text-white hover:bg-[#2b2824]"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t("add_first_item")}
                  </Button>
                }
              />
            ) : filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const category = item.category ?? guessFoodCategory(item.name);
                  const categoryLabel =
                    categoryLabels[category as keyof typeof categoryLabels] ??
                    formatCategoryFallback(category);
                  const recurringItem = recurringLookup.get(item.id);

                  return (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      locale={locale}
                      categoryLabel={categoryLabel}
                      expiryLabel={formatExpiry(item.expiryDate, locale)}
                      isExpiring={isExpiringSoon(item.expiryDate)}
                      isLowStock={lowStockItemIds.has(item.id)}
                      isRecurring={Boolean(recurringItem?.isActive)}
                      pendingQuantity={pendingQuantityId === item.id}
                      pendingDelete={pendingDeleteId === item.id}
                      pendingRecurring={pendingRecurringId === item.id}
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
                      decreaseLabel={t("aria_decrease")}
                      increaseLabel={t("aria_increase")}
                      deleteLabel={t("aria_delete")}
                      onIncrease={() => void handleQuantityChange(item, 1)}
                      onDecrease={() => void handleQuantityChange(item, -1)}
                      onDelete={() => void handleDeleteItem(item.id)}
                      onToggleRecurring={() =>
                        void handleToggleRecurring(
                          item,
                          !recurringItem?.isActive,
                          recurringItem?.id,
                        )
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <SectionStateCard
                title={t("no_results_title")}
                description={t("no_results_description")}
                icon={<Search className="h-5 w-5" />}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="rounded-full border-stone-200 bg-white hover:bg-stone-50"
                  >
                    {t("clear_filters")}
                  </Button>
                }
              />
            )}
          </section>
        </div>
      </div>

      <div className="fixed bottom-5 right-4 z-40 sm:right-6">
        <Button
          type="button"
          onClick={() => setIsAddSheetOpen(true)}
          className="h-14 rounded-full bg-[#1f1d1a] px-5 text-white shadow-xl shadow-black/10 hover:bg-[#2a2723]"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("add_item")}
        </Button>
      </div>

      <Dialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-1/2 w-full max-w-[calc(100%-0.75rem)] translate-x-[-50%] translate-y-0 gap-0 rounded-t-[1.75rem] rounded-b-none border-x border-t border-b-0 bg-white p-0 shadow-2xl sm:max-w-lg"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200" />
          <DialogHeader className="px-5 pb-0 pt-4 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-[#1f1d1a]">
              {t("quick_add_title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-stone-500">
              {t("quick_add_description")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddSubmit} className="space-y-4 px-5 pb-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1f1d1a]">
                {t("field_name")}
              </label>
              <Input
                value={quickAddName}
                onChange={(event) => setQuickAddName(event.target.value)}
                placeholder={t("field_name_placeholder")}
                className="h-11 rounded-2xl border-stone-200 bg-[#fcfaf7]"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1f1d1a]">
                  {t("field_quantity")}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={quickAddQuantity}
                  onChange={(event) => setQuickAddQuantity(event.target.value)}
                  placeholder={t("field_quantity_placeholder")}
                  className="h-11 rounded-2xl border-stone-200 bg-[#fcfaf7]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1f1d1a]">
                  {t("field_unit")}
                </label>
                <Select value={quickAddUnit} onValueChange={setQuickAddUnit}>
                  <SelectTrigger className="h-11 rounded-2xl border-stone-200 bg-[#fcfaf7] shadow-none">
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
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1f1d1a]">
                {t("field_category")}
              </label>
              <Select value={quickAddCategory} onValueChange={setQuickAddCategory}>
                <SelectTrigger className="h-11 rounded-2xl border-stone-200 bg-[#fcfaf7] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabels[category as keyof typeof categoryLabels] ??
                        formatCategoryFallback(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm leading-6 text-stone-600">
              {t("quick_add_hint")}
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSheetOpen(false)}
                className="flex-1 rounded-full border-stone-200 bg-white hover:bg-stone-50"
              >
                {t("quick_add_cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingQuickAdd || quickAddName.trim().length === 0}
                className="flex-1 rounded-full bg-[#1f1d1a] text-white hover:bg-[#2b2824]"
              >
                {isSubmittingQuickAdd ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {t("quick_add_submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "warm" | "alert";
}) {
  const toneClasses =
    tone === "warm"
      ? "bg-[#fff4e8] text-[#8b5e3c]"
      : tone === "alert"
        ? "bg-[#fff0eb] text-[#b4532a]"
        : "bg-white text-stone-700";

  return (
    <div className={cn("rounded-[1.5rem] border border-stone-200 px-3 py-3 shadow-sm", toneClasses)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
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
        "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-[#1f1d1a] bg-[#1f1d1a] text-white"
          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
      )}
    >
      {label}
    </button>
  );
}

function RestockRow({
  locale,
  categoryLabel,
  insight,
  addLabel,
  shoppingLabel,
  currentLabel,
  targetLabel,
  missingLabel,
  pendingAction,
  pendingShopping,
  onAddNow,
  onAddToShopping,
}: {
  locale: string;
  categoryLabel: string;
  insight: RestockInsight;
  addLabel: string;
  shoppingLabel: string;
  currentLabel: string;
  targetLabel: string;
  missingLabel: string;
  pendingAction: boolean;
  pendingShopping: boolean;
  onAddNow: () => void;
  onAddToShopping: () => void;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#eadcc7] bg-white/95 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-bold tracking-tight text-[#1f1d1a]">
              {insight.restockItem.name}
            </span>
            {!insight.pantryItem ? (
              <Badge className="rounded-full border-0 bg-[#fce7d6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b4532a]">
                {missingLabel}
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-stone-200 bg-stone-50 text-stone-600">
              {categoryLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full border-stone-200 bg-stone-50 text-stone-600">
              {currentLabel}: {formatQuantity(insight.currentQuantity, insight.unit, locale)}
            </Badge>
            <Badge variant="outline" className="rounded-full border-stone-200 bg-stone-50 text-stone-600">
              {targetLabel}: {formatQuantity(insight.targetQuantity, insight.unit, locale)}
            </Badge>
          </div>
        </div>

        <div className="rounded-full bg-[#fff4e8] p-2 text-[#b4532a]">
          <ShoppingCart className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          onClick={onAddNow}
          disabled={pendingAction}
          className="flex-1 rounded-full bg-[#1f1d1a] text-white hover:bg-[#2b2824]"
        >
          {pendingAction ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          {addLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddToShopping}
          disabled={pendingShopping}
          className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
        >
          {pendingShopping ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="mr-1.5 h-4 w-4" />
          )}
          {shoppingLabel}
        </Button>
      </div>
    </article>
  );
}

function InventoryRow({
  item,
  locale,
  categoryLabel,
  expiryLabel,
  isExpiring,
  isLowStock,
  isRecurring,
  pendingQuantity,
  pendingDelete,
  pendingRecurring,
  sourceLabel,
  lowStockLabel,
  expiringLabel,
  recurringLabel,
  decreaseLabel,
  increaseLabel,
  deleteLabel,
  onIncrease,
  onDecrease,
  onDelete,
  onToggleRecurring,
}: {
  item: PantryItem;
  locale: string;
  categoryLabel: string;
  expiryLabel: string | null;
  isExpiring: boolean;
  isLowStock: boolean;
  isRecurring: boolean;
  pendingQuantity: boolean;
  pendingDelete: boolean;
  pendingRecurring: boolean;
  sourceLabel: string;
  lowStockLabel: string;
  expiringLabel: string;
  recurringLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  deleteLabel: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onToggleRecurring: () => void;
}) {
  const quantityValue = parseStoredNumber(item.quantity) ?? 0;

  return (
    <article className="rounded-[1.75rem] border border-stone-200 bg-white/95 px-4 py-4 shadow-sm">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-[#1f1d1a]">
                {item.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full border-stone-200 bg-stone-50 text-stone-600">
                  {categoryLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full border-stone-200 bg-stone-50 text-stone-600">
                  {sourceLabel}
                </Badge>
                {isLowStock ? (
                  <Badge className="rounded-full border-0 bg-[#fce7d6] text-[#b4532a]">
                    {lowStockLabel}
                  </Badge>
                ) : null}
                {isExpiring ? (
                  <Badge className="rounded-full border-0 bg-[#fff0eb] text-[#b4532a]">
                    {expiringLabel}
                  </Badge>
                ) : null}
              </div>
              {expiryLabel ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                  {expiryLabel}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onToggleRecurring}
              disabled={pendingRecurring}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                isRecurring
                  ? "border-[#1f1d1a] bg-[#1f1d1a] text-white"
                  : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
              )}
              aria-label={recurringLabel}
              title={recurringLabel}
            >
              {pendingRecurring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrease}
            disabled={pendingQuantity || quantityValue <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={decreaseLabel}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="min-w-[5.5rem] text-center">
            <p className="text-lg font-black tracking-tight text-[#1f1d1a]">
              {pendingQuantity ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              ) : (
                formatQuantity(item.quantity, item.unit, locale)
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onIncrease}
            disabled={pendingQuantity}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-[#f7f2eb] text-[#1f1d1a] transition-colors hover:bg-[#efe5d6] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={increaseLabel}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={pendingDelete}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={deleteLabel}
        >
          {pendingDelete ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </article>
  );
}
