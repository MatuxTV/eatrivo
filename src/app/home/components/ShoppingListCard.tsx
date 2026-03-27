"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  Calendar,
  FileText,
  ShoppingCart,
  Check,
  ChefHat,
  RefreshCw,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/formatters";
import { MealPlanViewerModal } from "@/app/home/components/MealPlanViewerModal";
import { localizeAmountForDisplay } from "@/lib/pantry/format";
import InlineEditPanel from "@/components/inline-edit/InlineEditPanel";
import InlineEditToggleButton from "@/components/inline-edit/InlineEditToggleButton";

const cn = (...a: (string | false | null | undefined)[]) =>
  a.filter(Boolean).join(" ");

interface ShoppingListViewerItem {
  id: string;
  name: string;
  quantity: string | null;
  quantityValue?: string | null;
  unit?: string | null;
  category: string;
  sortOrder: number;
  isChecked: boolean;
  checkedAt: string | null;
}

function formatCategoryLabel(category: string): string {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// ─── Shopping List Viewer ──────────────────────────────────────────────────────

interface ViewerProps {
  id: string;
  locale: string;
  items: ShoppingListViewerItem[];
  isEditable?: boolean;
  isUpdatingItemId?: string | null;
  editQuantityLabel: string;
  saveQuantityLabel: string;
  cancelEditLabel: string;
  quantityLabel: string;
  quantityPlaceholder: string;
  onSaveQuantity?: (
    itemId: string,
    nextQuantity: string | null,
  ) => Promise<boolean>;
}

const STORAGE_KEY = (id: string) => `sl-checked:${id}`;

function ShoppingListViewer({
  id,
  locale,
  items,
  isEditable = false,
  isUpdatingItemId = null,
  editQuantityLabel,
  saveQuantityLabel,
  cancelEditLabel,
  quantityLabel,
  quantityPlaceholder,
  onSaveQuantity,
}: ViewerProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY(id))
          : null;
      if (raw) {
        return new Set<string>(JSON.parse(raw));
      }
    } catch {
      return new Set<string>(items.filter((item) => item.isChecked).map((item) => item.id));
    }

    return new Set<string>(items.filter((item) => item.isChecked).map((item) => item.id));
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftQuantity, setDraftQuantity] = useState("");
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ShoppingListViewerItem[]>();
    const orderedItems = [...items].sort((left, right) => left.sortOrder - right.sortOrder);

    for (const item of orderedItems) {
      const categoryKey = item.category || "other";
      const categoryItems = groups.get(categoryKey);
      if (categoryItems) {
        categoryItems.push(item);
      } else {
        groups.set(categoryKey, [item]);
      }
    }

    return [...groups.entries()].map(([category, categoryItems]) => ({
      category,
      label: formatCategoryLabel(category),
      items: categoryItems,
    }));
  }, [items]);

  const totalItems = items.length;
  const checkedCount = items.reduce(
    (count, item) => count + (checked.has(item.id) ? 1 : 0),
    0,
  );

  useEffect(() => {
    if (editingItemId && !items.some((item) => item.id === editingItemId)) {
      setEditingItemId(null);
      setDraftQuantity("");
    }
  }, [editingItemId, items]);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem(STORAGE_KEY(id), JSON.stringify([...next]));
      } catch {
        /* quota */
      }
      return next;
    });

  const closeEditor = () => {
    setEditingItemId(null);
    setDraftQuantity("");
  };

  const openEditor = (itemId: string, currentQuantity: string | null) => {
    setEditingItemId(itemId);
    setDraftQuantity(currentQuantity ?? "");
  };

  return (
    <div className="space-y-4 ">
      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="flex items-center gap-3 px-1 ">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {checkedCount} / {totalItems}
          </span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-eatrivo-purple rounded-full transition-all duration-300"
              style={{
                width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%`,
              }}
            />
          </div>
          {checkedCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setChecked(new Set());
                try {
                  localStorage.removeItem(STORAGE_KEY(id));
                } catch {
                  /* noop */
                }
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              Resetovať
            </motion.button>
          )}
        </div>
      )}

      {/* Categories */}
      {groupedItems.map((group) => (
        <div key={group.category}>
          {/* Category pill */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-eatrivo-purple/10 text-eatrivo-purple px-3 py-1 rounded-full text-sm font-bold">
              {group.label}
            </span>
          </div>

          {/* Items */}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isDone = checked.has(item.id);
              const isEditing = editingItemId === item.id;
              const localizedQuantity = localizeAmountForDisplay(
                item.quantityValue,
                item.unit,
                item.quantity,
                locale,
              );
              return (
                <li key={item.id} className="list-none">
                  <div
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group",
                      isDone ? "bg-gray-50" : "hover:bg-eatrivo-purple/5",
                      isEditing && "bg-eatrivo-purple/[0.06] ring-1 ring-eatrivo-purple/10",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {/* Circle checkbox */}
                      <span
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                          isDone
                            ? "bg-eatrivo-purple border-eatrivo-purple"
                            : "border-gray-300 group-hover:border-eatrivo-purple/50",
                        )}
                      >
                        {isDone && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        )}
                      </span>

                      {/* Food name */}
                      <span
                        className={cn(
                          "flex-1 text-sm font-medium transition-colors",
                          isDone ? "line-through text-gray-400" : "text-gray-800",
                        )}
                      >
                        {item.name}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      {localizedQuantity ? (
                        <span
                          className={cn(
                            "flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                            isDone
                              ? "bg-gray-100 text-gray-400"
                              : "bg-eatrivo-purple/10 text-eatrivo-purple",
                          )}
                        >
                          {localizedQuantity}
                        </span>
                      ) : null}

                      {isEditable && onSaveQuantity ? (
                        isUpdatingItemId === item.id ? (
                          <button
                            type="button"
                            disabled
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 opacity-50"
                            aria-label={editQuantityLabel}
                            title={editQuantityLabel}
                          >
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </button>
                        ) : (
                          <InlineEditToggleButton
                            label={editQuantityLabel}
                            isActive={isEditing}
                            onClick={() => {
                              if (isEditing) {
                                closeEditor();
                                return;
                              }
                              openEditor(item.id, item.quantity);
                            }}
                            disabled={
                              isUpdatingItemId !== null && isUpdatingItemId !== item.id
                            }
                            className="h-7 w-7 border-gray-200 text-gray-400"
                            iconClassName="h-3.5 w-3.5"
                          />
                        )
                      ) : null}
                    </div>
                  </div>

                  <InlineEditPanel
                    isOpen={isEditing}
                    className="ml-8 mt-2"
                    panelClassName="border-gray-100 bg-none bg-eatrivo-white-secondary shadow-none"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`shopping-quantity-${item.id}`}
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500"
                        >
                          {quantityLabel}
                        </label>
                        <Input
                          id={`shopping-quantity-${item.id}`}
                          value={draftQuantity}
                          onChange={(event) => setDraftQuantity(event.target.value)}
                          onKeyDown={async (event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              closeEditor();
                              return;
                            }

                            if (event.key !== "Enter" || !onSaveQuantity) {
                              return;
                            }

                            event.preventDefault();
                            const success = await onSaveQuantity(
                              item.id,
                              draftQuantity.trim() ? draftQuantity.trim() : null,
                            );
                            if (success) {
                              closeEditor();
                            }
                          }}
                          placeholder={quantityPlaceholder}
                          className="h-10 border-gray-200 bg-white/90 shadow-none"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeEditor}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/20"
                          aria-label={cancelEditLabel}
                          title={cancelEditLabel}
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!onSaveQuantity) {
                              return;
                            }

                            const success = await onSaveQuantity(
                              item.id,
                              draftQuantity.trim() ? draftQuantity.trim() : null,
                            );
                            if (success) {
                              closeEditor();
                            }
                          }}
                          disabled={isUpdatingItemId === item.id}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-eatrivo-purple px-3.5 text-sm font-semibold text-white transition-colors hover:bg-eatrivo-purple/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/20"
                        >
                          {isUpdatingItemId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span>{saveQuantityLabel}</span>
                        </button>
                      </div>
                    </div>
                  </InlineEditPanel>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

interface ShoppingListCardProps {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status:
    | "draft"
    | "active"
    | "approved"
    | "purchased"
    | "completed"
    | "cancelled";
  onStatusChange?: () => void;
  /** Callback to regenerate a new shopping list (cancels current draft first) */
  onRegenerate?: () => void;
}

export default function ShoppingListCard({
  id,
  title,
  description,
  weekStartDate,
  weekEndDate,
  status,
  onStatusChange,
  onRegenerate,
}: ShoppingListCardProps) {
  const t = useTranslations("home.shoppingList");
  const locale = useLocale();
  const [isViewing, setIsViewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListViewerItem[] | null>(null);
  const [isMealPlanModalOpen, setMealPlanModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingStatus, setIsSettingStatus] = useState(false);
  const [isUpdatingItemId, setIsUpdatingItemId] = useState<string | null>(null);

  const formatDateLocal = (dateString: string) =>
    formatDate(dateString, locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getStatusConfig = (status: ShoppingListCardProps["status"]) => {
    switch (status) {
      case "draft":
        return {
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-100",
          label: t("status.draft", { defaultValue: "Návrh" }),
        };
      case "approved":
        return {
          color: "text-eatrivo-green",
          bg: "bg-eatrivo-green/10",
          border: "border-eatrivo-green/20",
          label: t("status.approved", { defaultValue: "Schválené" }),
        };
      case "purchased":
        return {
          color: "text-green-700",
          bg: "bg-green-50",
          border: "border-green-100",
          label: t("status.purchased", { defaultValue: "Nakúpené" }),
        };
      case "active":
        return {
          color: "text-green-700",
          bg: "bg-green-50",
          border: "border-green-100",
          label: t("status.active"),
        };
      case "completed":
        return {
          color: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-100",
          label: t("status.completed"),
        };
      case "cancelled":
        return {
          color: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-100",
          label: t("status.cancelled"),
        };
      default:
        return {
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-100",
          label: t("status.unknown"),
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const canEditItems = status === "draft" || status === "active" || status === "approved";
  const editQuantityLabel = t("editQuantity", { defaultValue: "Upraviť množstvo" });
  const saveQuantityLabel = t("saveQuantity", { defaultValue: "Uložiť" });
  const cancelEditLabel = t("cancelEditQuantity", {
    defaultValue: "Zrušiť úpravu množstva",
  });
  const quantityLabel = t("quantityLabel", { defaultValue: "Množstvo" });
  const quantityPlaceholder = t("quantityPlaceholder", {
    defaultValue: "napr. 2 ks alebo 500 g",
  });

  const handleStatusChange = async (listId: string, newStatus: string) => {
    try {
      setIsSettingStatus(true);
      const response = await fetch(`/api/shopping-lists/${listId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Aktualizácia zlyhala");
        return;
      }
      toast.success(
        newStatus === "approved"
          ? "Plán bol schválený! ✅"
          : newStatus === "purchased"
            ? "Nákup potvrdený! Ingrediencie sú v spajzi 🎉"
            : "Aktualizované",
      );
      onStatusChange?.();
    } catch {
      toast.error("Nepodarilo sa aktualizovať stav");
    } finally {
      setIsSettingStatus(false);
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Odstránenie zlyhalo");
        return;
      }
      toast.success("Pôvodný návrh bol odstránený");
      onStatusChange?.();
    } catch {
      toast.error("Nepodarilo sa odstrániť zoznam");
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "feature",
          eventName: "shopping_list_downloaded",
          metadata: { shoppingListId: id },
        }),
      }).catch(console.error);

      // Open print-ready page — browser saves as PDF via system dialog
      window.open(
        `/api/shopping-lists/${id}/view?print=1&locale=${encodeURIComponent(locale)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      logger.error("Download error", error, {
        context: "ShoppingListCard",
        metadata: { shoppingListId: id },
      });
      toast.error(t("errors.download"));
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  const handleView = async () => {
    try {
      setIsViewing(true);
      setShoppingItems(null);

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "feature",
          eventName: "shopping_list_viewed",
          metadata: { shoppingListId: id },
        }),
      }).catch(console.error);

      // Fetch structured shopping items and show inline
      const res = await fetch(`/api/shopping-lists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setShoppingItems(Array.isArray(data.items) ? data.items : []);
      setSheetOpen(true);
    } catch (error) {
      logger.error("View error", error, {
        context: "ShoppingListCard",
        metadata: { shoppingListId: id },
      });
      toast.error(t("errors.view"));
    } finally {
      setIsViewing(false);
    }
  };

  const handleSaveQuantity = async (itemId: string, nextQuantity: string | null) => {
    if (isUpdatingItemId) {
      return false;
    }

    const normalizedQuantity =
      typeof nextQuantity === "string" && nextQuantity.trim().length > 0
        ? nextQuantity.trim()
        : null;
    const previousItems = shoppingItems ? [...shoppingItems] : null;
    setIsUpdatingItemId(itemId);
    setShoppingItems((prev) =>
      prev?.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: normalizedQuantity,
            }
          : item,
      ) ?? prev,
    );

    try {
      const response = await fetch(`/api/shopping-lists/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountLabel: normalizedQuantity }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        items?: ShoppingListViewerItem[];
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Nepodarilo sa upraviť množstvo");
      }

      if (Array.isArray(data?.items)) {
        setShoppingItems(data.items);
      }
      toast.success("Množstvo bolo upravené");
      return true;
    } catch (error) {
      setShoppingItems(previousItems);
      toast.error(
        error instanceof Error ? error.message : "Nepodarilo sa upraviť množstvo",
      );
      return false;
    } finally {
      setIsUpdatingItemId(null);
    }
  };

  return (
    <>
      <MealPlanViewerModal
        shoppingListId={id}
        isOpen={isMealPlanModalOpen}
        onOpenChange={setMealPlanModalOpen}
      />

      {/* ── Inline Viewer Dialog ─────────────────────────── */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-lg w-full max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-eatrivo-white-primary">
          <DialogHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-eatrivo-purple/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-eatrivo-purple/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-4 h-4 text-eatrivo-purple" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-tight">
                  {title}
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateLocal(weekStartDate)} –{" "}
                  {formatDateLocal(weekEndDate)}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable shopping list content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 bg-eatrivo-white-primary">
            {shoppingItems !== null ? (
              <ShoppingListViewer
                id={id}
                locale={locale}
                items={shoppingItems}
                isEditable={canEditItems}
                isUpdatingItemId={isUpdatingItemId}
                editQuantityLabel={editQuantityLabel}
                saveQuantityLabel={saveQuantityLabel}
                cancelEditLabel={cancelEditLabel}
                quantityLabel={quantityLabel}
                quantityPlaceholder={quantityPlaceholder}
                onSaveQuantity={canEditItems ? handleSaveQuantity : undefined}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                <ShoppingCart className="w-8 h-8 animate-pulse" />
                <span className="text-sm">Načítavam zoznam...</span>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t flex-shrink-0 flex justify-between items-center bg-eatrivo-white-primary">
            <p className="text-xs text-gray-400">Vytvorené pomocou Eatrivo</p>
            <Button
              size="sm"
              asChild
              onClick={() =>
                window.open(
                  `/api/shopping-lists/${id}/view?print=1&locale=${encodeURIComponent(locale)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Uložiť ako PDF
              </motion.button>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Card ─────────────────────────────────────────── */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card
          className={`group relative overflow-hidden ${status === "draft" ? "border-2 border-dashed border-eatrivo-orange/50" : ""} shadow-md hover:shadow-xl transition-shadow duration-300 bg-white h-full flex flex-col`}
        >
          {/* Status Bar */}
          <div
            className={`h-1.5 w-full ${status === "active" ? "bg-eatrivo-purple" : status === "approved" ? "bg-eatrivo-green" : status === "draft" ? "bg-eatrivo-orange/60" : status === "cancelled" ? "bg-eatrivo-red" : "bg-gray-200"}`}
          />

          {/* Loading Overlay - only for transitions from 'approved' (Purchasing) */}
          <AnimatePresence>
            {isSettingStatus && status === "approved" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-eatrivo-green/90 backdrop-blur-sm flex flex-col items-center justify-center text-white"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-10 h-10 mb-2" />
                </motion.div>
                <span className="text-sm font-bold animate-pulse">
                  Aktualizujem...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 h-5 border",
                      statusConfig.bg,
                      statusConfig.color,
                      statusConfig.border,
                    )}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-eatrivo-purple transition-colors">
                  {title}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
                {description}
              </p>
            )}

            {/* Meta Info */}
            <div className="space-y-2 mb-5 pt-4 border-t border-gray-50 mt-auto">
              <div className="flex items-center text-xs text-gray-500 font-medium">
                <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                {formatDateLocal(weekStartDate)} -{" "}
                {formatDateLocal(weekEndDate)}
              </div>
              <div className="flex items-center text-xs text-gray-500 font-medium">
                <FileText className="w-3.5 h-3.5 mr-2 text-gray-400" />
                {t("pdfDocument")}
              </div>
            </div>

            {/* Actions */}
            {status !== "draft" && status !== "approved" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="sm"
                  asChild
                  onClick={handleView}
                  disabled={isViewing}
                  className="w-full bg-eatrivo-white-secondary border-2 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-eatrivo-purple hover:border-eatrivo-purple/30 transition-colors"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("view")}
                  </motion.button>
                </Button>
                <Button
                  size="sm"
                  asChild
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white shadow-sm hover:shadow transition-shadow"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("download")}
                  </motion.button>
                </Button>
              </div>
            )}

            {/* Draft approval actions */}
            {status === "draft" && (
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  asChild
                  onClick={() => setMealPlanModalOpen(true)}
                  className="w-full bg-eatrivo-orange hover:bg-eatrivo-orange/90 text-white shadow-sm hover:shadow transition-all"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChefHat className="w-5 h-5 mr-2" />
                    Zobraziť jedálniček
                  </motion.button>
                </Button>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStatusChange(id, "approved")}
                    disabled={isSettingStatus}
                    className="flex-1 py-1.5 px-3 bg-eatrivo-purple text-white text-xs font-semibold rounded-lg hover:bg-eatrivo-purple/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70"
                  >
                    {isSettingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "✓ Schváliť plán"
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      await handleDelete(id);
                      onRegenerate?.();
                    }}
                    className="py-1.5 px-3 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Vygenerovať znovu
                  </motion.button>
                </div>
              </div>
            )}

            {/* Purchased action */}
            {status === "approved" && (
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  size="sm"
                  asChild
                  onClick={handleView}
                  disabled={isViewing}
                  className="w-full bg-eatrivo-white-secondary border-2 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-eatrivo-purple hover:border-eatrivo-purple/30 transition-colors"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("view")}
                  </motion.button>
                </Button>
                <div className=" flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStatusChange(id, "purchased")}
                    disabled={isSettingStatus}
                    className="w-full py-1.5 px-3 bg-eatrivo-green text-white text-xs font-semibold rounded-lg hover:bg-eatrivo-green/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70"
                  >
                    🛒 Označiť ako nakúpené
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="w-1/3 py-1.5 px-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-eatrivo-white-primary">
          <DialogHeader>
            <DialogTitle>Naozaj chcete zamietnuť plán?</DialogTitle>
            <DialogDescription>
              Zamietnutím sa natrvalo vymaže tento nákupný zoznam aj k nemu
              priradený jedálniček. Táto akcia sa nedá vrátiť späť a budete
              musieť vygenerovať nový plán odznova.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 flex flex-colsm:gap-0">
            <Button
              type="button"
              className="bg-eatrivo-red/90 hover:bg-red-700 text-white"
              onClick={async () => {
                await handleDelete(id);
                setIsDeleteDialogOpen(false);
                onRegenerate?.();
              }}
            >
              Áno, zamietnuť
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="bg-eatrivo-white-primary border-1 border-eatrivo-black-secondary/50 "
              >
                Zrušiť
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
