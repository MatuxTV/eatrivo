"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  ScanLine,
  Search,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { TrackPageEvent } from "@/components/analytics/TrackPageEvent";
import MembershipUpgradeModal from "@/components/billing/MembershipUpgradeModal";
import { useTutorialSurface } from "@/components/tutorial/TutorialProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePantry,
  type PantryItem,
  type PantryRestockItem,
} from "@/hooks/usePantry";
import { trackClientEvent } from "@/lib/analytics/analytics-client";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { cn } from "@/lib/utils/utils";
import { PANTRY_QUANTITY_TRACKING } from "@/lib/config/features";
import { getCategoryTint, splitCategoryLabel } from "./categoryVisuals";
import AddPantryItemModal from "./AddPantryItemModal";
import PantryItemRow from "./PantryItemRow";
import ReceiptScanModal from "./ReceiptScanModal";
import PhotoScanModal from "./PhotoScanModal";
import ReceiptScanUpgradeHero from "./ReceiptScanUpgradeHero";
import type { InitialPantrySectionData } from "@/app/home/types/section-data";

type FilterKey = "all" | "restock" | "expiring" | "manual" | "shopping_list";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: "easeOut" as const },
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

function PantryLoadingState() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-3">
        <Skeleton className="h-6 w-36 rounded-full bg-gray-200" />
        {[...Array(2)].map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-full bg-gray-200" />
            <Skeleton className="h-4 w-64 rounded-full bg-gray-100" />
          </div>
          <div className="w-full max-w-[18rem]">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-xl bg-gray-100" />
              <Skeleton className="h-11 rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
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
  membership?: "basic" | "premium" | "pro" | "trainer";
  initialData?: InitialPantrySectionData;
}

export default function PantrySection({
  membership = "basic",
  initialData,
}: PantrySectionProps = {}) {
  const t = useTranslations("pantry");
  const locale = useLocale();
  useTutorialSurface("pantry");
  const shouldReduceMotion = useReducedMotion();
  const triggerHaptic = useHapticFeedback();
  const {
    items,
    restockItems,
    pendingDrafts,
    isLoading,
    isPreparingDrafts,
    isConfirmingDrafts,
    error,
    addItem,
    addItemsBatch,
    updateItem,
    deleteItem,
    addItemToShoppingList,
    toggleRecurringForItem,
    confirmDrafts,
    discardDrafts,
    refresh,
  } = usePantry({
    initialItems: initialData?.items,
    initialRestockItems: initialData?.restockItems,
    initialPendingDrafts: initialData?.pendingDrafts,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [scanModalEntryMode, setScanModalEntryMode] = useState<"receipt" | "barcode">("receipt");
  const [isScanUpgradeModalOpen, setIsScanUpgradeModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRecurringId, setPendingRecurringId] = useState<string | null>(null);
  const [pendingAddPackageId, setPendingAddPackageId] = useState<string | null>(null);
  const hasScanAccess =
    membership === "premium" || membership === "pro" || membership === "trainer";

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

  const categoryOptions = useMemo(
    () => Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    [categoryLabels],
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

  async function handleConfirmDrafts() {
    const draftCount = pendingDrafts.length;
    const success = await confirmDrafts();
    if (success) {
      trackClientEvent({
        eventName: "pantry_checkout_completed",
        metadata: {
          locale,
          draftCount,
          surface: "pantry_page",
        },
      });
      triggerHaptic("success");
    }
  }

  async function handleDiscardDrafts() {
    const success = await discardDrafts();
    if (success) {
      triggerHaptic("light");
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
    updates: {
      quantity: number | null;
      unit: string | null;
      category: string | null;
      trackingMode: "quantity" | "availability";
      inStock?: boolean;
    },
  ): Promise<boolean> {
    const success = await updateItem(itemId, updates);
    if (success) {
      triggerHaptic("medium");
    }

    return success;
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

  function handleOpenScanModal(entryMode: "receipt" | "barcode" = "receipt") {
    if (!hasScanAccess) {
      triggerHaptic("light");
      setScanModalEntryMode(entryMode);
      setIsScanUpgradeModalOpen(true);
      return;
    }

    triggerHaptic("light");
    setScanModalEntryMode(entryMode);
    setIsScanModalOpen(true);
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <TrackPageEvent
        eventName="pantry_viewed"
        metadata={{ locale, surface: "pantry" }}
      />
      {isLoading ? (
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
          data-tutorial-anchor="pantry-root"
          className="max-w-5xl mx-auto space-y-6 pb-24"
        >
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
                      {/* [PANTRY_QUANTITY_TRACKING] flag off: drafts show only the name */}
                      {PANTRY_QUANTITY_TRACKING ? (
                        <p className="mt-1 text-xs text-gray-500">
                          {draft.quantity ? `${draft.quantity}${draft.unit ? ` ${draft.unit}` : ""}` : draft.unit ?? "—"}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <div className="font-brand space-y-5 rounded-2xl border border-gray-100 bg-white p-4 md:p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[1.75rem] font-bold leading-[1.2] tracking-[-0.03em] text-gray-900">
                    {t("inventory_title")}
                  </h2>
                  <span className="shrink-0 rounded-full bg-eatrivo-purple/10 px-3 py-1.5 text-[13px] font-bold leading-4 text-eatrivo-purple">
                    {headerSubtitle}
                  </span>
                </div>
                <p className="text-sm font-medium leading-[1.5] text-gray-500">
                  {/* [PANTRY_QUANTITY_TRACKING] flag off: the description no longer promises quantity edits */}
                  {PANTRY_QUANTITY_TRACKING
                    ? t("inventory_description")
                    : t("inventory_description_presence")}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsPhotoModalOpen(true);
                    }}
                    className="h-12 gap-2 rounded-2xl border-[1.5px] border-[#E9D9FF] bg-[#F6F0FF] px-3 text-[15px] font-bold text-eatrivo-purple shadow-none transition-[transform,background-color] duration-150 hover:bg-[#EFE4FF] active:scale-[0.97]"
                  >
                    <Camera className="h-[18px] w-[18px]" />
                    <span>{t("photo_add_button")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleOpenScanModal("receipt")}
                    className="h-12 gap-2 rounded-2xl border-[1.5px] border-[#E9D9FF] bg-white px-3 text-[15px] font-bold text-eatrivo-purple shadow-none transition-[transform,background-color] duration-150 hover:bg-eatrivo-purple/5 active:scale-[0.97]"
                  >
                    <ScanLine className="h-[18px] w-[18px]" />
                    <span>{t("scan_bill")}</span>
                  </Button>
                </div>

                <Button
                  data-tutorial-anchor="pantry-add-item"
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsAddModalOpen(true);
                  }}
                  className="h-12 w-full gap-2 rounded-2xl bg-eatrivo-purple px-4 text-[15px] font-bold text-white shadow-[0_6px_14px_-4px_rgba(123,63,242,0.35)] transition-[transform,background-color] duration-150 hover:bg-eatrivo-purple/90 active:scale-[0.97]"
                >
                  <Plus className="h-[18px] w-[18px]" />
                  <span>{t("add_item")}</span>
                </Button>
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
                    data-tutorial-anchor="pantry-add-item"
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
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {groupedItems.map(([category, categoryItems], categoryIndex) => {
                  const categoryLabel =
                    categoryLabels[category as keyof typeof categoryLabels] ??
                    formatCategoryFallback(category);
                  const { emoji: categoryEmoji, name: categoryName } =
                    splitCategoryLabel(categoryLabel);
                  const isExpanded = expandedCategories[category] ?? false;
                  const hasExpiringItems = categoryItems.some((item) =>
                    isExpiringSoon(item.expiryDate),
                  );
                  const toggleLabel = isExpanded
                    ? t("aria_collapse_category", { category: categoryName })
                    : t("aria_expand_category", { category: categoryName });

                  return (
                    <section
                      key={category}
                      className={cn(categoryIndex > 0 && "border-t border-gray-100")}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        aria-expanded={isExpanded}
                        aria-controls={`pantry-category-${category}`}
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        className={cn(
                          "flex w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400",
                          isExpanded ? "bg-[#FAF7FF]" : "hover:bg-gray-50/70",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[22px] leading-none",
                            getCategoryTint(category),
                          )}
                        >
                          {categoryEmoji ?? <Package className="h-5 w-5 text-eatrivo-purple" />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold leading-snug tracking-[-0.015em] text-gray-900">
                              {categoryName}
                            </span>
                            {hasExpiringItems ? (
                              <span
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eatrivo-red/10 text-eatrivo-red"
                                title={t("expiry_warning_one")}
                                aria-label={t("expiry_warning_one")}
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            ) : null}
                          </span>
                          <span className="block text-[13px] font-medium leading-[18px] text-gray-500">
                            {t("category_item_count", { count: categoryItems.length })}
                          </span>
                        </span>

                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200 ease-out",
                            isExpanded ? "rotate-90 text-eatrivo-purple" : "text-gray-400",
                          )}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded ? (
                          <motion.div
                            key={`${category}-items`}
                            id={`pantry-category-${category}`}
                            initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                            animate={
                              shouldReduceMotion
                                ? undefined
                                : { opacity: 1, height: "auto" }
                            }
                            exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                            className="overflow-hidden bg-[#FAF7FF]"
                          >
                            <div className="space-y-0.5 px-3.5 pb-3.5 pt-0.5">
                              {categoryItems.map((item) => {
                                const recurringItem = recurringLookup.get(item.id);

                                return (
                                  <PantryItemRow
                                    key={item.id}
                                    item={item}
                                    locale={locale}
                                    categoryLabel={categoryLabel}
                                    categoryValue={item.category ?? guessFoodCategory(item.name)}
                                    categoryFieldLabel={t("field_category")}
                                    categoryOptions={categoryOptions}
                                    expiryLabel={formatExpiry(item.expiryDate, locale)}
                                    isExpiring={isExpiringSoon(item.expiryDate)}
                                    // [PANTRY_QUANTITY_TRACKING] flag off: no low-stock highlight (the row already shows availability)
                                    isLowStock={PANTRY_QUANTITY_TRACKING && item.lowStock}
                                    isRecurring={Boolean(recurringItem?.isActive)}
                                    isPendingQuantity={false}
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
                                    trackingModeToggleLabel={t("tracking_mode_toggle_label")}
                                    trackingModeHelpText={t("tracking_mode_toggle_help")}
                                    availableLabel={t("availability_in_stock")}
                                    unavailableLabel={t("availability_out_of_stock")}
                                    toggleAvailabilityLabel={t("toggle_availability")}
                                    deleteLabel={t("aria_delete")}
                                    addPackageLabel={t("row_add_package_label")}
                                    addPackageCtaLabel={t("row_add_package")}
                                    addPackagePendingLabel={t("row_add_package_pending")}
                                    addPackageReadyLabel={t("row_add_package_again")}
                                    showAddPackageAction={item.supportsRestockPackage}
                                    isPendingAddPackage={pendingAddPackageId === item.id}
                                    onDelete={() => void handleDeleteItem(item.id)}
                                    onSaveEdit={(updates) => handleItemEdit(item.id, updates)}
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
                            </div>
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
          <MembershipUpgradeModal
            isOpen={isScanUpgradeModalOpen}
            onClose={() => setIsScanUpgradeModalOpen(false)}
            hero={<ReceiptScanUpgradeHero mode={scanModalEntryMode} />}
          />
          <ReceiptScanModal
            isOpen={isScanModalOpen}
            onClose={() => setIsScanModalOpen(false)}
            onCompleted={refresh}
            initialEntryMode={scanModalEntryMode}
          />
          <PhotoScanModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onCompleted={refresh}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
