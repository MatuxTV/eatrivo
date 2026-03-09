"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Lightbulb,
  ChefHat,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/formatters";
import { MealPlanViewerModal } from "@/app/home/premium/MealPlanViewerModal";

const cn = (...a: (string | false | null | undefined)[]) =>
  a.filter(Boolean).join(" ");

// ─── Markdown parser ───────────────────────────────────────────────────────────

interface ParsedItem {
  name: string;
  quantity: string;
  note: string;
}
interface ParsedCategory {
  name: string;
  items: ParsedItem[];
}
interface ParsedList {
  macros: string;
  categories: ParsedCategory[];
  tips: string[];
  footer: string;
}

function parseShoppingList(markdown: string): ParsedList {
  const result: ParsedList = {
    macros: "",
    categories: [],
    tips: [],
    footer: "",
  };
  let currentCategory: ParsedCategory | null = null;
  let inTips = false;
  let tableHeaderDone = false;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // h1 title → skip (already in Dialog header)
    if (line.startsWith("# ")) continue;

    // Macros summary line
    if (line.includes("Denný príjem") || line.includes("Daily intake")) {
      result.macros = line.replace(/\*\*/g, "");
      continue;
    }

    // Budget/footer line
    if (line.startsWith("💰")) {
      result.footer = line.replace(/\*\*/g, "");
      continue;
    }

    // Validation block → skip
    if (line.match(/^✅ VALIDÁCIA|^\d+\. Množstv/)) continue;

    // Separator line
    if (line === "---") continue;

    // h2 → new category
    if (line.startsWith("## ")) {
      if (currentCategory) result.categories.push(currentCategory);
      currentCategory = { name: line.slice(3).trim(), items: [] };
      inTips = false;
      tableHeaderDone = false;
      continue;
    }

    // h3 → tips section start
    if (line.startsWith("### ")) {
      if (currentCategory) {
        result.categories.push(currentCategory);
        currentCategory = null;
      }
      inTips = true;
      continue;
    }

    // Table separator row → skip
    if (line.match(/^\|[\s\-:|]+\|$/)) continue;

    // Table row → shopping item
    if (currentCategory && line.startsWith("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      // First row is the header (Potravina | Množstvo | Poznámka)
      if (!tableHeaderDone) {
        tableHeaderDone = true;
        continue;
      }
      if (cells.length >= 1) {
        currentCategory.items.push({
          name: cells[0] ?? "",
          quantity: cells[1] ?? "",
          note: cells[2] ?? "",
        });
      }
      continue;
    }

    // Tip bullet
    if (inTips && (line.startsWith("- ") || line.startsWith("* "))) {
      result.tips.push(line.slice(2).trim());
    }
  }

  if (currentCategory && currentCategory.items.length > 0)
    result.categories.push(currentCategory);
  return result;
}

// ─── Shopping List Viewer ──────────────────────────────────────────────────────

interface ViewerProps {
  markdown: string;
  id: string;
}

const STORAGE_KEY = (id: string) => `sl-checked:${id}`;

function ShoppingListViewer({ markdown, id }: ViewerProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY(id))
          : null;
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const parsed = useMemo(() => parseShoppingList(markdown), [markdown]);

  const totalItems = parsed.categories.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );
  const checkedCount = checked.size;

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

      {/* Macros summary */}
      {parsed.macros && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
          {parsed.macros}
        </p>
      )}

      {/* Categories */}
      {parsed.categories.map((cat, ci) => (
        <div key={ci}>
          {/* Category pill */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-eatrivo-purple/10 text-eatrivo-purple px-3 py-1 rounded-full text-sm font-bold">
              {cat.name}
            </span>
          </div>

          {/* Items */}
          <ul className="space-y-1">
            {cat.items.map((item, ii) => {
              const key = `${ci}-${ii}`;
              const isDone = checked.has(key);
              return (
                <li key={key} className="list-none">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150 group",
                      isDone ? "bg-gray-50" : "hover:bg-eatrivo-purple/5",
                    )}
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

                    {/* Quantity badge */}
                    {item.quantity && (
                      <span
                        className={cn(
                          "flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                          isDone
                            ? "bg-gray-100 text-gray-400"
                            : "bg-eatrivo-purple/10 text-eatrivo-purple",
                        )}
                      >
                        {item.quantity}
                      </span>
                    )}
                  </button>

                  {/* Note (smaller, indented) */}
                  {item.note && !isDone && (
                    <p className="ml-11 text-xs text-gray-400 pb-1">
                      {item.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Tips — plain, no checkboxes */}
      {parsed.tips.length > 0 && (
        <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">Tipy</span>
          </div>
          <ul className="space-y-1.5">
            {parsed.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-amber-700"
              >
                <span className="flex-shrink-0 w-1 h-1 rounded-full bg-amber-400 mt-1.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer — estimated price */}
      {parsed.footer && (
        <p className="text-xs text-gray-400 text-center pt-1">
          {parsed.footer}
        </p>
      )}
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
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [isMealPlanModalOpen, setMealPlanModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingStatus, setIsSettingStatus] = useState(false);

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
        `/api/shopping-lists/${id}/view?print=1`,
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

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "feature",
          eventName: "shopping_list_viewed",
          metadata: { shoppingListId: id },
        }),
      }).catch(console.error);

      // Fetch markdown content and show inline
      const res = await fetch(`/api/shopping-lists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMarkdownContent(data.markdownContent ?? "");
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

          {/* Scrollable markdown content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 bg-eatrivo-white-primary">
            {markdownContent !== null ? (
              <ShoppingListViewer markdown={markdownContent} id={id} />
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
                  `/api/shopping-lists/${id}/view?print=1`,
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
