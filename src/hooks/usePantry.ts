"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface PantryItem {
  id: string;
  userProfileId: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  source: "manual" | "shopping_list";
  shoppingListId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPantryItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  expiryDate?: string | null;
}

export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.debug("[Pantry] fetchItems: start");
      const response = await fetch("/api/pantry");
      if (!response.ok) throw new Error("Failed to fetch pantry items");
      const data = await response.json();
      setItems(data.items ?? []);
      console.debug("[Pantry] fetchItems: loaded", { count: (data.items ?? []).length });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load pantry";
      console.error("[Pantry] fetchItems: error", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (item: NewPantryItem): Promise<boolean> => {
    try {
      console.debug("[Pantry] addItem: start", { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category });
      const response = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const data = await response.json();
        console.warn("[Pantry] addItem: failed", { status: response.status, error: data.error });
        toast.error(data.error || "Nepodarilo sa pridať položku");
        return false;
      }
      const data = await response.json();
      console.debug("[Pantry] addItem: success", { id: data.item?.id });
      // Optimistic update
      setItems((prev) => [...prev, data.item]);
      toast.success("Položka pridaná do spajzy ✓");
      return true;
    } catch (err) {
      console.error("[Pantry] addItem: exception", err);
      toast.error("Chyba pri pridávaní položky");
      return false;
    }
  }, []);

  const updateItem = useCallback(
    async (id: string, updates: Partial<NewPantryItem>): Promise<boolean> => {
      try {
        console.debug("[Pantry] updateItem: start", { id, updates });
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
        const data = await response.json();
        console.debug("[Pantry] updateItem: success", { id });
        setItems((prev) =>
          prev.map((item) => (item.id === id ? data.item : item)),
        );
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
      console.debug("[Pantry] deleteItem: start", { id });
      const response = await fetch(`/api/pantry/${id}`, { method: "DELETE" });
      if (!response.ok) {
        console.warn("[Pantry] deleteItem: failed", { id, status: response.status });
        toast.error("Nepodarilo sa odstrániť položku");
        return false;
      }
      console.debug("[Pantry] deleteItem: success", { id });
      // Optimistic remove
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Položka odstránená");
      return true;
    } catch (err) {
      console.error("[Pantry] deleteItem: exception", err);
      toast.error("Chyba pri odstraňovaní položky");
      return false;
    }
  }, []);

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

  return {
    items,
    itemsByCategory,
    expiringItems,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refresh: fetchItems,
  };
}
