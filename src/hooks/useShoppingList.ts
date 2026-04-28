"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { formatAmountLabel, localizeAmountForDisplay } from "@/lib/pantry/format";
import { PANTRY_UNIT_OPTIONS, parseQuantity } from "@/lib/ingredients/units";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ShoppingListItem {
  id?: string;
  name: string;
  quantity: string | null;
  quantityValue?: string | null;
  unit?: string | null;
  category: string;
  isChecked?: boolean;
}

interface ShoppingListApiItem {
  id: string;
  name: string;
  quantity: string | null;
  quantityValue?: string | null;
  unit?: string | null;
  category: string;
  sortOrder: number;
  isChecked?: boolean;
}

export interface ShoppingListApiMeta {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SHOPPING_LIST_CATEGORY_ORDER = [
  "dairy",
  "meat_fish",
  "fruit",
  "vegetables",
  "grains",
  "eggs",
  "condiments",
  "beverages",
  "nuts_seeds",
  "other",
] as const;

const SHOPPING_CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
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

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UseShoppingListOptions {
  refreshPantrySummary: () => Promise<void>;
}

export function useShoppingList({ refreshPantrySummary }: UseShoppingListOptions) {
  const t = useTranslations("home");
  const pantryT = useTranslations("pantry");
  const locale = useLocale();
  const { data: session } = useSession();
  const triggerHaptic = useHapticFeedback();

  /* ---- state ---- */
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingListApiMeta | null>(null);
  const [isCompletingShoppingList, setIsCompletingShoppingList] = useState(false);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isRemovingItemId, setIsRemovingItemId] = useState<string | null>(null);
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [quantityDraftValue, setQuantityDraftValue] = useState("");
  const [quantityDraftUnit, setQuantityDraftUnit] = useState("ks");
  const [isUpdatingQuantityItemId, setIsUpdatingQuantityItemId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  /* ---- helpers ---- */

  const mapShoppingListItems = useCallback(
    (items: ShoppingListApiItem[]): ShoppingListItem[] =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        quantityValue: item.quantityValue ?? null,
        unit: item.unit ?? null,
        category: item.category,
        isChecked: item.isChecked,
      })),
    [],
  );

  const getShoppingCategoryLabel = useCallback(
    (category: string) => {
      const key = SHOPPING_CATEGORY_TRANSLATION_KEYS[category] ?? "other";
      try {
        return pantryT(`categories.${key}` as Parameters<typeof pantryT>[0]);
      } catch {
        return category;
      }
    },
    [pantryT],
  );

  /* ---- callbacks ---- */

  const toggleCheckItem = useCallback(
    (itemId: string) => {
      triggerHaptic("light");

      const prevChecked = checkedItemIds.has(itemId);
      const nextChecked = !prevChecked;

      setCheckedItemIds((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.add(itemId);
        else next.delete(itemId);
        return next;
      });

      fetch(`/api/shopping-lists/current/items/${itemId}/check`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: nextChecked }),
      }).catch(() => {
        toast.error("Chyba synchronizácie s databázou");
        setCheckedItemIds((prev) => {
          const next = new Set(prev);
          if (prevChecked) next.add(itemId);
          else next.delete(itemId);
          return next;
        });
      });
    },
    [triggerHaptic, checkedItemIds],
  );

  const closeQuantityEditor = useCallback(() => {
    setEditingQuantityItemId(null);
    setQuantityDraftValue("");
    setQuantityDraftUnit("ks");
  }, []);

  const openQuantityEditor = useCallback(
    (
      itemId: string,
      currentQuantityLabel: string | null,
      currentQuantityValue?: string | null,
      currentUnit?: string | null,
    ) => {
      const parsedQuantity =
        currentQuantityValue && currentUnit
          ? { value: Number.parseFloat(currentQuantityValue), unit: currentUnit }
          : currentQuantityLabel
            ? parseQuantity(currentQuantityLabel)
            : null;

      setEditingQuantityItemId(itemId);
      setQuantityDraftValue(
        parsedQuantity && Number.isFinite(parsedQuantity.value)
          ? String(parsedQuantity.value)
          : "",
      );
      const nextUnit = parsedQuantity?.unit ?? currentUnit ?? "ks";
      setQuantityDraftUnit(
        PANTRY_UNIT_OPTIONS.includes(nextUnit as (typeof PANTRY_UNIT_OPTIONS)[number])
          ? nextUnit
          : "ks",
      );
    },
    [],
  );

  const handleSaveQuantity = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (isUpdatingQuantityItemId) return false;

      const trimmedQuantity = quantityDraftValue.trim();
      const parsedQuantity = trimmedQuantity ? Number.parseFloat(trimmedQuantity) : null;
      const normalizedQuantity =
        parsedQuantity !== null && Number.isFinite(parsedQuantity)
          ? formatAmountLabel(parsedQuantity, quantityDraftUnit || null)
          : null;
      const currentItem = shoppingListItems.find((item) => item.id === itemId);
      if (!currentItem) return false;

      if ((currentItem.quantity ?? "") === (normalizedQuantity ?? "")) {
        closeQuantityEditor();
        return true;
      }

      const previousItems = [...shoppingListItems];
      setIsUpdatingQuantityItemId(itemId);
      setShoppingListItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: normalizedQuantity,
                quantityValue:
                  parsedQuantity !== null && Number.isFinite(parsedQuantity)
                    ? String(parsedQuantity)
                    : null,
                unit:
                  parsedQuantity !== null && Number.isFinite(parsedQuantity)
                    ? quantityDraftUnit
                    : null,
              }
            : item,
        ),
      );

      try {
        const response = await fetch(`/api/shopping-lists/current/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountLabel: normalizedQuantity }),
        });

        if (!response.ok) throw new Error("Update failed");

        triggerHaptic("light");
        toast.success("Množstvo bolo upravené");
        closeQuantityEditor();
        return true;
      } catch {
        toast.error("Nepodarilo sa upraviť množstvo");
        setShoppingListItems(previousItems);
        return false;
      } finally {
        setIsUpdatingQuantityItemId(null);
      }
    },
    [closeQuantityEditor, isUpdatingQuantityItemId, quantityDraftUnit, quantityDraftValue, shoppingListItems, triggerHaptic],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (isRemovingItemId) return;
      setIsRemovingItemId(itemId);
      triggerHaptic("medium");

      const previousItems = [...shoppingListItems];
      const previousCheckedItemIds = new Set(checkedItemIds);

      setShoppingListItems((prev) => prev.filter((item) => item.id !== itemId));
      setCheckedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      fetch(`/api/shopping-lists/current/items/${itemId}`, { method: "DELETE" })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to remove item");
        })
        .catch(() => {
          toast.error(t("basic.shoppingList.removeError"));
          setShoppingListItems(previousItems);
          setCheckedItemIds(previousCheckedItemIds);
        })
        .finally(() => {
          setIsRemovingItemId(null);
        });
    },
    [isRemovingItemId, triggerHaptic, t, shoppingListItems, checkedItemIds],
  );

  const handleStartEditTitle = useCallback(() => {
    setEditTitleValue(currentShoppingList?.title || t("greeting.actions.shoppingList"));
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [currentShoppingList?.title, t]);

  const cancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleSaveTitle = useCallback(async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || !currentShoppingList?.id) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const response = await fetch(`/api/shopping-lists/${currentShoppingList.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        toast.error(t("basic.shoppingList.titleUpdateError"));
      } else {
        setCurrentShoppingList((prev) => (prev ? { ...prev, title: trimmed } : prev));
      }
    } catch {
      toast.error(t("basic.shoppingList.titleUpdateError"));
    } finally {
      setIsEditingTitle(false);
    }
  }, [editTitleValue, currentShoppingList?.id, t]);

  const loadCurrentShoppingList = useCallback(async () => {
    if (!session?.user?.id) {
      setShoppingListItems([]);
      setCurrentShoppingList(null);
      return;
    }

    try {
      const response = await fetch("/api/shopping-lists/current", { cache: "no-store" });

      if (!response.ok) {
        logger.warn("Failed to load current shopping list", {
          context: "useShoppingList",
          metadata: { status: response.status },
        });
        return;
      }

      const payload = (await response.json()) as {
        shoppingList?: ShoppingListApiMeta | null;
        items?: ShoppingListApiItem[];
      };

      setCurrentShoppingList(payload.shoppingList ?? null);
      const items = Array.isArray(payload.items) ? mapShoppingListItems(payload.items) : [];
      setShoppingListItems(items);
      const initialChecked = new Set<string>();
      items.forEach((item) => {
        if (item.isChecked && item.id) initialChecked.add(item.id);
      });
      setCheckedItemIds(initialChecked);
    } catch (error) {
      logger.warn("Failed to fetch current shopping list", {
        context: "useShoppingList",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [mapShoppingListItems, session?.user?.id]);

  const handleAddToShoppingList = useCallback(
    async (ingredientName: string, quantity: string | null, category: string | null) => {
      const normalizedName = ingredientName.trim();
      if (!normalizedName) return;

      const response = await fetch("/api/shopping-lists/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, amountLabel: quantity, category }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        logger.warn("Failed to add item to shopping list", {
          context: "useShoppingList",
          metadata: { ingredientName: normalizedName, status: response.status, error: payload?.error ?? null },
        });
        throw new Error(payload?.error ?? "Failed to add shopping list item");
      }

      const payload = (await response.json()) as { items?: ShoppingListApiItem[] };
      setShoppingListItems(Array.isArray(payload.items) ? mapShoppingListItems(payload.items) : []);
      if (payload.items) {
        setCurrentShoppingList(
          (prev) =>
            prev ?? { id: "current", title: t("greeting.actions.shoppingList"), description: null, status: "active" },
        );
      }
      await loadCurrentShoppingList();
    },
    [loadCurrentShoppingList, mapShoppingListItems, t],
  );

  const handleCompleteShoppingList = useCallback(async () => {
    if (!currentShoppingList?.id || isCompletingShoppingList) return;

    setIsCompletingShoppingList(true);

    try {
      const response = await fetch(
        `/api/shopping-lists/${currentShoppingList.id}/checkout-to-pantry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "checked_only", completeList: true }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to complete shopping list");
      }

      toast.success(t("basic.shoppingList.completeSuccess") || "Nákup uložený do špajze!");
      setCheckedItemIds(new Set());

      await refreshPantrySummary();
      await loadCurrentShoppingList();
    } catch (error) {
      logger.warn("Failed to complete shopping list", {
        context: "useShoppingList",
        metadata: {
          shoppingListId: currentShoppingList.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setIsCompletingShoppingList(false);
    }
  }, [currentShoppingList?.id, isCompletingShoppingList, loadCurrentShoppingList, refreshPantrySummary, t]);

  /* ---- derived ---- */

  const totalChecked = useMemo(
    () => shoppingListItems.filter((item) => checkedItemIds.has(item.id ?? "")).length,
    [shoppingListItems, checkedItemIds],
  );

  const allItemsChecked = shoppingListItems.length > 0 && totalChecked === shoppingListItems.length;

  const shoppingListItemsByCategory = useMemo(() => {
    return shoppingListItems.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
      const category = item.category || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [shoppingListItems]);

  const shoppingListCategories = useMemo(() => {
    const presentCategories = Object.keys(shoppingListItemsByCategory);
    const orderedCategories = SHOPPING_LIST_CATEGORY_ORDER.filter((c) => presentCategories.includes(c));
    const remainingCategories = presentCategories
      .filter((c) => !SHOPPING_LIST_CATEGORY_ORDER.includes(c as (typeof SHOPPING_LIST_CATEGORY_ORDER)[number]))
      .sort((a, b) => getShoppingCategoryLabel(a).localeCompare(getShoppingCategoryLabel(b)));
    return [...orderedCategories, ...remainingCategories];
  }, [getShoppingCategoryLabel, shoppingListItemsByCategory]);

  /* ---- effects ---- */

  useEffect(() => {
    if (editingQuantityItemId && !shoppingListItems.some((item) => item.id === editingQuantityItemId)) {
      closeQuantityEditor();
    }
  }, [closeQuantityEditor, editingQuantityItemId, shoppingListItems]);

  useEffect(() => {
    void loadCurrentShoppingList();
  }, [loadCurrentShoppingList]);

  /* ---- public API ---- */

  return {
    // state
    shoppingListItems,
    currentShoppingList,
    isCompletingShoppingList,
    checkedItemIds,
    isEditingTitle,
    editTitleValue,
    setEditTitleValue,
    isRemovingItemId,
    editingQuantityItemId,
    quantityDraftValue,
    setQuantityDraftValue,
    quantityDraftUnit,
    setQuantityDraftUnit,
    isUpdatingQuantityItemId,
    titleInputRef,
    // derived
    totalChecked,
    allItemsChecked,
    shoppingListItemsByCategory,
    shoppingListCategories,
    // callbacks
    toggleCheckItem,
    closeQuantityEditor,
    openQuantityEditor,
    handleSaveQuantity,
    handleRemoveItem,
    handleStartEditTitle,
    cancelEditTitle,
    handleSaveTitle,
    handleCompleteShoppingList,
    handleAddToShoppingList,
    loadCurrentShoppingList,
    // helpers
    getShoppingCategoryLabel,
    localizeAmount: (item: ShoppingListItem) =>
      localizeAmountForDisplay(item.quantityValue, item.unit, item.quantity, locale),
  };
}
