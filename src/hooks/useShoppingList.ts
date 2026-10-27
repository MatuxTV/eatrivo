"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { formatAmountLabel, localizeAmountForDisplay } from "@/lib/pantry/format";
import { PANTRY_UNIT_OPTIONS, guessFoodCategory, parseQuantity } from "@/lib/ingredients/units";

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

export interface FrequentShoppingItem {
  name: string;
  category: string;
  timesBought: number;
}

export interface CustomShoppingItemInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
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

const MAX_VISIBLE_FREQUENT_ITEMS = 6;

const toNameKey = (name: string) => name.trim().toLowerCase();

// The server links a manually added item to the ingredient catalog in the
// background; one refresh after this delay picks up its corrected category.
const BACKGROUND_MATCH_REFRESH_MS = 5000;

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
  const [isMovingToPantry, setIsMovingToPantry] = useState(false);
  const [frequentItems, setFrequentItems] = useState<FrequentShoppingItem[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isRemovingItemId, setIsRemovingItemId] = useState<string | null>(null);
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [quantityDraftValue, setQuantityDraftValue] = useState("");
  const [quantityDraftUnit, setQuantityDraftUnit] = useState("ks");
  const [isUpdatingQuantityItemId, setIsUpdatingQuantityItemId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  // Items shown optimistically while their add request is still in flight,
  // keyed by lowercase name. Kept across server responses until confirmed.
  const pendingAddsRef = useRef(new Map<string, ShoppingListItem>());
  const backgroundRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const withPendingAdds = useCallback((items: ShoppingListItem[]) => {
    const onList = new Set(items.map((item) => toNameKey(item.name)));
    const stillPending = [...pendingAddsRef.current.entries()]
      .filter(([nameKey]) => !onList.has(nameKey))
      .map(([, item]) => item);
    return [...items, ...stillPending];
  }, []);

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
      setShoppingListItems(withPendingAdds(items));
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
  }, [mapShoppingListItems, session?.user?.id, withPendingAdds]);

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

  const loadFrequentItems = useCallback(async () => {
    if (!session?.user?.id) {
      setFrequentItems([]);
      return;
    }

    try {
      const response = await fetch("/api/shopping-lists/frequent", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { items?: FrequentShoppingItem[] };
      setFrequentItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      logger.warn("Failed to fetch frequently bought items", {
        context: "useShoppingList",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [session?.user?.id]);

  // Shows the item at once and saves it in the background; the server's
  // ingredient matching never blocks the UI.
  const handleAddCustomItem = useCallback(
    ({ name, quantity, unit, category }: CustomShoppingItemInput): boolean => {
      const normalizedName = name.trim();
      if (!normalizedName) return false;

      const nameKey = toNameKey(normalizedName);
      const hasAmount =
        quantity !== null && Number.isFinite(quantity) && quantity > 0 && Boolean(unit);
      const alreadyOnList = shoppingListItems.some((item) => toNameKey(item.name) === nameKey);

      if (!alreadyOnList && !pendingAddsRef.current.has(nameKey)) {
        const optimisticItem: ShoppingListItem = {
          name: normalizedName,
          quantity: hasAmount ? formatAmountLabel(quantity, unit) : null,
          quantityValue: hasAmount ? String(quantity) : null,
          unit: hasAmount ? unit : null,
          category: category ?? guessFoodCategory(normalizedName),
          isChecked: false,
        };
        pendingAddsRef.current.set(nameKey, optimisticItem);
        setShoppingListItems((prev) => [...prev, optimisticItem]);
      }
      triggerHaptic("light");

      void (async () => {
        try {
          const response = await fetch("/api/shopping-lists/current", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: normalizedName,
              ...(hasAmount ? { quantity, unit } : {}),
              ...(category ? { category } : {}),
            }),
          });

          if (!response.ok) throw new Error(`Add failed with status ${response.status}`);

          const payload = (await response.json()) as {
            shoppingList?: ShoppingListApiMeta | null;
            items?: ShoppingListApiItem[];
            pendingNormalizationItemIds?: string[];
          };
          pendingAddsRef.current.delete(nameKey);
          if (payload.shoppingList) setCurrentShoppingList(payload.shoppingList);
          if (Array.isArray(payload.items)) {
            setShoppingListItems(withPendingAdds(mapShoppingListItems(payload.items)));
          }

          if (payload.pendingNormalizationItemIds?.length) {
            if (backgroundRefreshRef.current) clearTimeout(backgroundRefreshRef.current);
            backgroundRefreshRef.current = setTimeout(() => {
              backgroundRefreshRef.current = null;
              void loadCurrentShoppingList();
            }, BACKGROUND_MATCH_REFRESH_MS);
          }
        } catch (error) {
          pendingAddsRef.current.delete(nameKey);
          setShoppingListItems((prev) =>
            prev.filter((item) => item.id || toNameKey(item.name) !== nameKey),
          );
          logger.warn("Failed to add custom shopping list item", {
            context: "useShoppingList",
            metadata: {
              name: normalizedName,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          toast.error(t("basic.shoppingList.addError"));
        }
      })();

      return true;
    },
    [loadCurrentShoppingList, mapShoppingListItems, shoppingListItems, t, triggerHaptic, withPendingAdds],
  );

  // Moves the checked items into the pantry; unchecked items stay on the list.
  const handleMoveCheckedToPantry = useCallback(async (): Promise<boolean> => {
    if (!currentShoppingList?.id || isMovingToPantry) return false;

    setIsMovingToPantry(true);

    try {
      const response = await fetch(
        `/api/shopping-lists/${currentShoppingList.id}/checkout-to-pantry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "checked_only", completeList: false }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to move items to pantry");
      }

      triggerHaptic("medium");
      toast.success(t("basic.shoppingList.moveSuccess"));
      setCheckedItemIds(new Set());

      await Promise.all([refreshPantrySummary(), loadCurrentShoppingList(), loadFrequentItems()]);
      return true;
    } catch (error) {
      logger.warn("Failed to move checked items to pantry", {
        context: "useShoppingList",
        metadata: {
          shoppingListId: currentShoppingList.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      toast.error(t("basic.shoppingList.moveError"));
      return false;
    } finally {
      setIsMovingToPantry(false);
    }
  }, [
    currentShoppingList?.id,
    isMovingToPantry,
    loadCurrentShoppingList,
    loadFrequentItems,
    refreshPantrySummary,
    t,
    triggerHaptic,
  ]);

  /* ---- derived ---- */

  const totalChecked = useMemo(
    () => shoppingListItems.filter((item) => checkedItemIds.has(item.id ?? "")).length,
    [shoppingListItems, checkedItemIds],
  );

  const allItemsChecked = shoppingListItems.length > 0 && totalChecked === shoppingListItems.length;

  const checkedItems = useMemo(
    () => shoppingListItems.filter((item) => checkedItemIds.has(item.id ?? "")),
    [shoppingListItems, checkedItemIds],
  );

  // Frequently bought items that are not on the list yet.
  const visibleFrequentItems = useMemo(() => {
    const onList = new Set(shoppingListItems.map((item) => toNameKey(item.name)));
    return frequentItems
      .filter((item) => !onList.has(toNameKey(item.name)))
      .slice(0, MAX_VISIBLE_FREQUENT_ITEMS);
  }, [frequentItems, shoppingListItems]);

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

  useEffect(() => {
    void loadFrequentItems();
  }, [loadFrequentItems]);

  useEffect(
    () => () => {
      if (backgroundRefreshRef.current) clearTimeout(backgroundRefreshRef.current);
    },
    [],
  );

  /* ---- public API ---- */

  return {
    // state
    shoppingListItems,
    currentShoppingList,
    isMovingToPantry,
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
    checkedItems,
    visibleFrequentItems,
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
    handleMoveCheckedToPantry,
    handleAddCustomItem,
    handleAddToShoppingList,
    loadCurrentShoppingList,
    // helpers
    getShoppingCategoryLabel,
    localizeAmount: (item: ShoppingListItem) =>
      localizeAmountForDisplay(item.quantityValue, item.unit, item.quantity, locale),
  };
}
