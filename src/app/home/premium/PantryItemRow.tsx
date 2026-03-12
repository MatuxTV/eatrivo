"use client";

import { useState } from "react";
import { Pencil, Trash2, AlertTriangle, Check, X, Pin } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PantryItem } from "@/hooks/usePantry";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";
import PantryQuantityWheel from "./PantryQuantityWheel";

interface PantryItemRowProps {
  item: PantryItem;
  isRecurring: boolean;
  recurringItemId?: string;
  onUpdate: (
    id: string,
    updates: {
      quantity?: number | null;
      unit?: string | null;
      expiryDate?: string | null;
    },
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleRecurring: (
    item: PantryItem,
    enabled: boolean,
    recurringItemId?: string,
  ) => Promise<boolean>;
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}

function formatExpiry(expiryDate: string | null): string | null {
  if (!expiryDate) return null;
  return new Date(expiryDate).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "short",
  });
}

export default function PantryItemRow({
  item,
  isRecurring,
  recurringItemId,
  onUpdate,
  onDelete,
  onToggleRecurring,
}: PantryItemRowProps) {
  const t = useTranslations("pantry");
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState<number | null>(
    item.quantity ? Number.parseFloat(String(item.quantity)) : null,
  );
  const [editUnit, setEditUnit] = useState(item.unit ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecurringSaving, setIsRecurringSaving] = useState(false);

  const expiringSoon = isExpiringSoon(item.expiryDate);
  const expiryLabel = formatExpiry(item.expiryDate);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(item.id, {
      quantity: editQty,
      unit: editUnit || null,
    });
    if (success) setIsEditing(false);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(item.id);
    // Component unmounts on success (optimistic remove from parent list)
    // Reset spinner if delete failed so user can retry
    if (!success) setIsDeleting(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group relative flex flex-col justify-between w-[176px] shrink-0 p-4 rounded-[1.5rem] border transition-all duration-300 snap-center min-h-[196px] ${
        expiringSoon
          ? "border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1"
          : "border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-eatrivo-purple/10 hover:border-eatrivo-purple/30 hover:-translate-y-1"
      }`}
    >
      {/* Top row: Icon + Expiry/Source */}
      <div className="flex items-start justify-between gap-2 w-full mb-3">
        {expiringSoon ? (
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-eatrivo-purple/10 transition-colors duration-300">
            <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-eatrivo-purple/50 transition-colors duration-300" />
          </div>
        )}

        {/* Badges container */}
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={async () => {
              setIsRecurringSaving(true);
              await onToggleRecurring(item, !isRecurring, recurringItemId);
              setIsRecurringSaving(false);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95 ${
              isRecurring
                ? "bg-eatrivo-purple text-white"
                : "bg-gray-100 text-gray-500 hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple"
            }`}
            aria-label={isRecurring ? t("restock.removeRecurring") : t("restock.makeRecurring")}
            title={isRecurring ? t("restock.removeRecurring") : t("restock.makeRecurring")}
          >
            {isRecurringSaving ? (
              <div className="h-3 w-3 rounded-full border border-current/30 border-t-current animate-spin" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </button>
          {item.source === "shopping_list" && (
            <span
              className="text-[10px] px-1.5 py-0.5 bg-eatrivo-purple/10 text-eatrivo-purple rounded-md font-bold uppercase tracking-wider leading-none"
              title="Z nákupného zoznamu"
            >
              🛒
            </span>
          )}
          {expiryLabel && (
            <span
              className={`text-[10px] uppercase font-black tracking-tight ${
                expiringSoon ? "text-amber-600" : "text-gray-400"
              }`}
            >
              Exp. {expiryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Item Name */}
      <div className="mb-4">
        <h3 className="text-[15px] font-black leading-tight text-[#1a1a2e] line-clamp-2 group-hover:text-eatrivo-purple transition-colors">
          {item.name}
        </h3>
      </div>

      {/* Bottom Area: Quantity or Edit Form */}
      <div className="flex items-end justify-between w-full mt-auto">
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full">
            <PantryQuantityWheel
              value={editQty}
              unit={editUnit || null}
              onChange={setEditQty}
            />
            <div className="flex gap-1.5 w-full">
              <Select value={editUnit || "ks"} onValueChange={setEditUnit}>
                <SelectTrigger className="w-full h-9 rounded-full border-gray-200 bg-white text-xs font-bold uppercase tracking-tight focus:ring-eatrivo-purple">
                  <SelectValue placeholder="ks" />
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
            <div className="flex items-center justify-between gap-1.5 w-full">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center active:scale-95"
              >
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-8 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm shadow-green-500/20 active:scale-95"
              >
                {isSaving ? (
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Display Quantity */}
            <div className="bg-gray-50 group-hover:bg-eatrivo-purple/5 transition-colors duration-300 px-3 py-1.5 rounded-lg border border-gray-100/50">
              <span className="text-[17px] font-black tracking-tighter text-[#1a1a2e] group-hover:text-eatrivo-purple transition-colors">
                {item.quantity
                  ? parseFloat(String(item.quantity)).toLocaleString("sk-SK")
                  : t("restock.quantityMissing")}
                <span className="text-xs font-bold text-gray-500 group-hover:text-eatrivo-purple/70 ml-0.5">
                  {item.unit ? " " + item.unit : ""}
                </span>
              </span>
            </div>

            {/* Edit / Delete Buttons (Hidden until hover on desktop) */}
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-eatrivo-purple hover:bg-eatrivo-purple/10 transition-colors active:scale-95 shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95 shadow-sm"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border border-gray-300 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
