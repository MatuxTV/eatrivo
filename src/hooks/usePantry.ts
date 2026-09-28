"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface PantryItem {
  id: string;
  userProfileId: string;
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  ingredientId: string | null;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  source: "manual" | "shopping_list";
  shoppingListId: string | null;
  createdAt: string;
  updatedAt: string;
  lowStock: boolean;
  lowStockReason: "missing_quantity" | "restock_threshold" | "out_of_stock" | null;
  restockItemId: string | null;
  restockDefaultQuantity: string | null;
  restockDefaultUnit: string | null;
  isStamped: boolean;
  supportsRestockPackage: boolean;
  isOnActiveShoppingList: boolean;
  activeShoppingListId: string | null;
  activeShoppingListItemId: string | null;
}

export interface PantryDraftItem {
  token: string;
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  trackingMode?: "quantity" | "availability" | null;
  inStock?: boolean | null;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  candidateKeys: string[];
  createdAt: string;
  expiresAt: string;
}

export interface PantryRestockItem {
  id: string;
  userProfileId: string;
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  defaultQuantity: string | null;
  defaultUnit: string | null;
  category: string | null;
  isActive: boolean;
  lastRestockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPantryItem {
  name: string;
  trackingMode?: "quantity" | "availability";
  inStock?: boolean;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  expiryDate?: string | null;
}

export interface BatchPantryProcessedItem {
  rawName: string;
  normalizedName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  action: "inserted" | "updated" | "skipped";
  pantryItemId: string | null;
  source: string;
  reason: string | null;
  candidateKeys: string[];
}

export interface BatchPantryResult {
  items: BatchPantryProcessedItem[];
  summary: {
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
  };
  usedAi: boolean;
}

interface PantryMutationResponse {
  item?: PantryItem;
  deleted?: boolean;
  deletedItemId?: string;
  normalizationQueued?: boolean;
  error?: string;
}

interface ShoppingListHandoffResponse {
  success?: boolean;
  addedItemIds?: string[];
  error?: string;
}

interface PantryRestockMutationResponse {
  item?: PantryRestockItem;
  error?: string;
}

interface PantryRestockListResponse {
  items?: PantryRestockItem[];
  error?: string;
}

interface PantryRestockQuickAddResponse {
  item?: PantryItem;
  mode?: "merged" | "replaced" | "inserted";
  restockItem?: PantryRestockItem;
  error?: string;
}

interface PantryDraftsResponse {
  drafts?: PantryDraftItem[];
  error?: string;
}

interface PantryDraftConfirmResponse extends PantryDraftsResponse {
  items?: PantryItem[];
}

interface UsePantryOptions {
  initialItems?: PantryItem[];
  initialRestockItems?: PantryRestockItem[];
  initialPendingDrafts?: PantryDraftItem[];
}

const PANTRY_CHANGED_EVENT = "pantry:changed";

export function usePantry(options: UsePantryOptions = {}) {
  const hasInitialItems = options.initialItems !== undefined;
  const hasInitialRestockItems = options.initialRestockItems !== undefined;
  const [items, setItems] = useState<PantryItem[]>(options.initialItems ?? []);
  const [restockItems, setRestockItems] = useState<PantryRestockItem[]>(
    options.initialRestockItems ?? [],
  );
  const [pendingDrafts, setPendingDrafts] = useState<PantryDraftItem[]>(
    options.initialPendingDrafts ?? [],
  );
  const [isLoading, setIsLoading] = useState(!hasInitialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingDrafts, setIsPreparingDrafts] = useState(false);
  const [isConfirmingDrafts, setIsConfirmingDrafts] = useState(false);
  const [isLoadingRestockItems, setIsLoadingRestockItems] = useState(
    !hasInitialRestockItems,
  );

  const fetchItems = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      const response = await fetch("/api/pantry");
      if (!response.ok) throw new Error("Failed to fetch pantry items");
      const data = await response.json();
      setItems(data.items ?? []);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load pantry";
      console.error("[Pantry] fetchItems: error", err);
      setError(message);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await fetch("/api/pantry/drafts", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch pantry drafts");
      }

      const data = (await response.json()) as PantryDraftsResponse;
      setPendingDrafts(data.drafts ?? []);
    } catch (err) {
      console.error("[Pantry] fetchDrafts: error", err);
    }
  }, []);

  const fetchRestockItems = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoadingRestockItems(true);
      }
      const response = await fetch("/api/pantry/restock-items", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch pantry restock items");
      }

      const data = (await response.json()) as PantryRestockListResponse;
      setRestockItems((data.items ?? []).filter((item) => item.isActive));
    } catch (err) {
      console.error("[Pantry] fetchRestockItems: error", err);
    } finally {
      if (showLoading) {
        setIsLoadingRestockItems(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      fetchItems(!hasInitialItems),
      fetchDrafts(),
      fetchRestockItems(!hasInitialRestockItems),
    ]).finally(() => {
      if (hasInitialItems) {
        setIsLoading(false);
      }

      if (hasInitialRestockItems) {
        setIsLoadingRestockItems(false);
      }
    });
  }, [fetchDrafts, fetchItems, fetchRestockItems, hasInitialItems, hasInitialRestockItems]);

  const prepareDrafts = useCallback(
    async (itemsToPrepare: NewPantryItem[]): Promise<boolean> => {
      try {
        setIsPreparingDrafts(true);
        const response = await fetch("/api/pantry/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToPrepare }),
        });
        const data = (await response.json()) as PantryDraftsResponse;

        if (!response.ok) {
          toast.error(data.error || "Nepodarilo sa pripraviť položky");
          return false;
        }

        setPendingDrafts(data.drafts ?? []);
        toast.success(
          itemsToPrepare.length === 1
            ? "Položka pripravená na potvrdenie"
            : `Pripravené na potvrdenie: ${itemsToPrepare.length} položky`,
        );
        return true;
      } catch (err) {
        console.error("[Pantry] prepareDrafts: exception", err);
        toast.error("Chyba pri príprave položiek");
        return false;
      } finally {
        setIsPreparingDrafts(false);
      }
    },
    [],
  );

  const addItem = useCallback(async (item: NewPantryItem): Promise<boolean> => {
    try {
      const response = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = (await response.json()) as PantryMutationResponse;

      if (!response.ok || !data.item) {
        toast.error(data.error || "Nepodarilo sa pridať položku");
        return false;
      }

      setItems((prev) => [...prev, data.item!]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
      }
      toast.success("Položka bola pridaná");
      return true;
    } catch (err) {
      console.error("[Pantry] addItem: exception", err);
      toast.error("Chyba pri pridávaní položky");
      return false;
    }
  }, []);

  const addItemsBatch = useCallback(
    async (itemsToAdd: NewPantryItem[]): Promise<BatchPantryResult | null> => {
      const success = await prepareDrafts(itemsToAdd);
      if (!success) {
        return null;
      }

      return {
        items: [],
        summary: {
          insertedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
        },
        usedAi: true,
      };
    },
    [prepareDrafts],
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<NewPantryItem>): Promise<boolean> => {
      try {
        const response = await fetch(`/api/pantry/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          console.warn("[Pantry] updateItem: failed", { id, status: response.status });
          toast.error("Nepodarilo sa aktualizovať položku");
          return false;
        }
        const data = (await response.json()) as PantryMutationResponse;

        if (data.deleted) {
          setItems((prev) => prev.filter((item) => item.id !== (data.deletedItemId ?? id)));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
          }
          toast.success("Položka odstránená");
          return true;
        }

        if (!data.item) {
          toast.error("Nepodarilo sa aktualizovať položku");
          return false;
        }

        setItems((prev) => prev.map((item) => (item.id === id ? data.item! : item)));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
        }
        toast.success("Položka aktualizovaná ✓");
        return true;
      } catch (err) {
        console.error("[Pantry] updateItem: exception", err);
        toast.error("Chyba pri aktualizácii položky");
        return false;
      }
    },
    [],
  );

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/pantry/${id}`, { method: "DELETE" });
      if (!response.ok) {
        console.warn("[Pantry] deleteItem: failed", { id, status: response.status });
        toast.error("Nepodarilo sa odstrániť položku");
        return false;
      }
      // Optimistic remove
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
      }
      toast.success("Položka odstránená");
      return true;
    } catch (err) {
      console.error("[Pantry] deleteItem: exception", err);
      toast.error("Chyba pri odstraňovaní položky");
      return false;
    }
  }, []);

  const stepItemQuantity = useCallback(
    async (
      id: string,
      operation: "increment" | "decrement",
      quantityDelta: number = 1,
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/pantry/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantityOperation: operation, quantityDelta }),
        });
        const data = (await response.json()) as PantryMutationResponse;

        if (!response.ok) {
          toast.error("Nepodarilo sa upraviť množstvo");
          return false;
        }

        if (data.deleted) {
          setItems((prev) => prev.filter((item) => item.id !== (data.deletedItemId ?? id)));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
          }
          toast.success("Položka odstránená");
          return true;
        }

        if (!data.item) {
          toast.error("Nepodarilo sa upraviť množstvo");
          return false;
        }

        setItems((prev) => prev.map((item) => (item.id === id ? data.item! : item)));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
        }
        return true;
      } catch (err) {
        console.error("[Pantry] stepItemQuantity: exception", err);
        toast.error("Chyba pri zmene množstva");
        return false;
      }
    },
    [],
  );

  const toggleRecurringForItem = useCallback(
    async (
      item: PantryItem,
      enabled: boolean,
      restockItemId?: string,
    ): Promise<boolean> => {
      try {
        if (enabled) {
          const response = await fetch("/api/pantry/restock-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pantryItemId: item.id }),
          });
          const data = (await response.json()) as PantryRestockMutationResponse;

          if (!response.ok || !data.item) {
            toast.error("Nepodarilo sa zapnúť pravidelné dopĺňanie");
            return false;
          }

          setRestockItems((current) => {
            const filtered = current.filter((entry) => entry.id !== data.item?.id);
            return [...filtered, data.item!];
          });
          toast.success("Položka je uložená medzi pravidelné nákupy");
          return true;
        }

        if (!restockItemId) {
          toast.error("Chýba recurring položka na vypnutie");
          return false;
        }

        const response = await fetch(`/api/pantry/restock-items/${restockItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
        const data = (await response.json()) as PantryRestockMutationResponse;

        if (!response.ok || !data.item) {
          toast.error("Nepodarilo sa vypnúť pravidelné dopĺňanie");
          return false;
        }

        setRestockItems((current) =>
          current.filter((entry) => entry.id !== data.item?.id),
        );
        toast.success("Položka už nie je medzi pravidelnými nákupmi");
        return true;
      } catch (err) {
        console.error("[Pantry] toggleRecurringForItem: exception", err);
        toast.error("Chyba pri zmene pravidelného dopĺňania");
        return false;
      }
    },
    [],
  );

  const updateRestockItem = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        defaultQuantity?: number | null;
        defaultUnit?: string | null;
        category?: string | null;
        isActive?: boolean;
      },
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/pantry/restock-items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = (await response.json()) as PantryRestockMutationResponse;

        if (!response.ok || !data.item) {
          toast.error("Nepodarilo sa upraviť pravidelnú položku");
          return false;
        }

        setRestockItems((current) => {
          const filtered = current.filter((entry) => entry.id !== data.item?.id);
          return data.item?.isActive ? [...filtered, data.item] : filtered;
        });
        toast.success("Predvolené množstvo je uložené");
        return true;
      } catch (err) {
        console.error("[Pantry] updateRestockItem: exception", err);
        toast.error("Chyba pri úprave pravidelnej položky");
        return false;
      }
    },
    [],
  );

  const quickAddRestockItem = useCallback(
    async (
      id: string,
      overrides?: {
        quantity?: number | null;
        unit?: string | null;
        mode?: "merge" | "replace";
      },
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/pantry/restock-items/${id}/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(overrides ?? {}),
        });
        const data = (await response.json()) as PantryRestockQuickAddResponse;

        if (!response.ok || !data.item) {
          toast.error("Nepodarilo sa doplniť položku do spajze");
          return false;
        }

        setItems((current) => {
          if (data.mode === "inserted") {
            return [...current, data.item!];
          }

          return current.map((entry) =>
            entry.id === data.item?.id ? data.item! : entry,
          );
        });

        if (data.restockItem) {
          setRestockItems((current) => {
            const filtered = current.filter((entry) => entry.id !== data.restockItem?.id);
            return data.restockItem?.isActive
              ? [...filtered, data.restockItem]
              : filtered;
          });
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
        }

        toast.success(
          data.mode === "merged"
            ? "Množstvo v spajzi bolo navýšené"
            : data.mode === "replaced"
              ? "Množstvo v spajzi bolo nastavené"
              : "Položka bola doplnená do spajze",
        );
        return true;
      } catch (err) {
        console.error("[Pantry] quickAddRestockItem: exception", err);
        toast.error("Chyba pri dopĺňaní do spajze");
        return false;
      }
    },
    [],
  );

  const addItemToShoppingList = useCallback(
    async (id: string, options?: { appendPackage?: boolean }): Promise<boolean> => {
      try {
        const response = await fetch("/api/shopping-lists/current", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pantryItemId: id,
            appendPackage: options?.appendPackage ?? false,
          }),
        });
        const data = (await response.json()) as ShoppingListHandoffResponse;

        if (!response.ok || !data.success) {
          toast.error(data.error || "Nepodarilo sa pridať na nákupný zoznam");
          return false;
        }

        await fetchItems();
        toast.success(
          options?.appendPackage
            ? "Ďalšie balenie bolo pridané na nákupný zoznam"
            : "Položka bola pridaná na nákupný zoznam",
        );
        return true;
      } catch (err) {
        console.error("[Pantry] addItemToShoppingList: exception", err);
        toast.error("Chyba pri presune na nákupný zoznam");
        return false;
      }
    },
    [fetchItems],
  );

  const addLowStockToShoppingList = useCallback(
    async (ids?: string[]): Promise<boolean> => {
      try {
        const response = await fetch("/api/shopping-lists/current", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            ids && ids.length > 0
              ? { pantryItemIds: ids, lowStockOnly: true }
              : { lowStockOnly: true },
          ),
        });
        const data = (await response.json()) as ShoppingListHandoffResponse;

        if (!response.ok || !data.success) {
          toast.error(data.error || "Nepodarilo sa pridať low-stock položky");
          return false;
        }

        await fetchItems();
        toast.success("Low-stock položky boli pridané na nákupný zoznam");
        return true;
      } catch (err) {
        console.error("[Pantry] addLowStockToShoppingList: exception", err);
        toast.error("Chyba pri presune low-stock položiek");
        return false;
      }
    },
    [fetchItems],
  );

  // Group items by category
  const itemsByCategory = items.reduce<Record<string, PantryItem[]>>(
    (acc, item) => {
      const cat = item.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {},
  );

  // Items expiring within 3 days
  const expiringItems = items.filter((item) => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate).getTime();
    const threeDays = Date.now() + 3 * 24 * 60 * 60 * 1000;
    return expiry <= threeDays;
  });

  const confirmDrafts = useCallback(async (): Promise<boolean> => {
    try {
      setIsConfirmingDrafts(true);
      const response = await fetch("/api/pantry/drafts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as PantryDraftConfirmResponse;

      if (!response.ok) {
        toast.error(data.error || "Nepodarilo sa potvrdiť zmeny");
        return false;
      }

      setPendingDrafts(data.drafts ?? []);
      await fetchItems();
      await fetchDrafts();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
      }
      toast.success("Zmeny v špajzi boli potvrdené ✓");
      return true;
    } catch (err) {
      console.error("[Pantry] confirmDrafts: exception", err);
      toast.error("Chyba pri potvrdzovaní zmien");
      return false;
    } finally {
      setIsConfirmingDrafts(false);
    }
  }, [fetchDrafts, fetchItems]);

  const discardDrafts = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/pantry/drafts/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as PantryDraftsResponse;

      if (!response.ok) {
        toast.error(data.error || "Nepodarilo sa zrušiť zmeny");
        return false;
      }

      setPendingDrafts(data.drafts ?? []);
      toast.success("Čakajúce zmeny boli zrušené");
      return true;
    } catch (err) {
      console.error("[Pantry] discardDrafts: exception", err);
      toast.error("Chyba pri rušení zmien");
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchItems(), fetchDrafts(), fetchRestockItems()]);
  }, [fetchDrafts, fetchItems, fetchRestockItems]);

  return {
    items,
    restockItems,
    pendingDrafts,
    itemsByCategory,
    expiringItems,
    isLoading,
    isLoadingRestockItems,
    isPreparingDrafts,
    isConfirmingDrafts,
    error,
    addItem,
    addItemsBatch,
    updateItem,
    stepItemQuantity,
    deleteItem,
    toggleRecurringForItem,
    updateRestockItem,
    quickAddRestockItem,
    addItemToShoppingList,
    addLowStockToShoppingList,
    confirmDrafts,
    discardDrafts,
    refresh,
  };
}
