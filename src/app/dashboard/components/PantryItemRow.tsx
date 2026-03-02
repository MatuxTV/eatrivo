"use client";

import { useState } from "react";
import { Pencil, Trash2, AlertTriangle, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import type { PantryItem } from "@/hooks/usePantry";

interface PantryItemRowProps {
  item: PantryItem;
  onUpdate: (
    id: string,
    updates: {
      quantity?: number | null;
      unit?: string | null;
      expiryDate?: string | null;
    },
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
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
  onUpdate,
  onDelete,
}: PantryItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.quantity ?? "");
  const [editUnit, setEditUnit] = useState(item.unit ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const expiringSoon = isExpiringSoon(item.expiryDate);
  const expiryLabel = formatExpiry(item.expiryDate);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(item.id, {
      quantity: editQty ? parseFloat(String(editQty)) : null,
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-colors ${
        expiringSoon
          ? "border-amber-200 bg-amber-50/50"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      {/* Expiry warning icon */}
      {expiringSoon && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      )}

      {/* Name + source badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-gray-800 truncate">
            {item.name}
          </span>
          {item.source === "shopping_list" && (
            <span
              className="text-[10px] px-1 py-0.5 bg-eatrivo-purple/10 text-eatrivo-purple rounded font-medium"
              title="Z nákupného zoznamu"
            >
              🛒
            </span>
          )}
        </div>
        {expiryLabel && (
          <span
            className={`text-[11px] ${expiringSoon ? "text-amber-600 font-medium" : "text-gray-400"}`}
          >
            exp. {expiryLabel}
          </span>
        )}
      </div>

      {/* Quantity + Unit (editable) */}
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            className="w-16 h-7 text-xs px-2 py-1"
            min="0"
            step="0.001"
          />
          <Input
            type="text"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            className="w-12 h-7 text-xs px-2 py-1"
            placeholder="ks"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {(item.quantity || item.unit) && (
            <span className="text-sm text-gray-600 font-medium tabular-nums">
              {item.quantity
                ? parseFloat(String(item.quantity)).toLocaleString("sk-SK")
                : ""}
              {item.unit ? " " + item.unit : ""}
            </span>
          )}
          {/* Edit + Delete buttons */}
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border border-gray-300 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
