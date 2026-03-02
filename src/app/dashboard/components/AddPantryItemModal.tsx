"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewPantryItem } from "@/hooks/usePantry";

const CATEGORIES = [
  { value: "dairy", label: "🥛 Mliečne výrobky" },
  { value: "meat_fish", label: "🥩 Mäso a ryby" },
  { value: "fruit", label: "🍎 Ovocie" },
  { value: "vegetables", label: "🥦 Zelenina" },
  { value: "grains", label: "🌾 Obilniny & pečivo" },
  { value: "eggs", label: "🥚 Vajcia" },
  { value: "condiments", label: "🧂 Koreniny & omáčky" },
  { value: "beverages", label: "🥤 Nápoje" },
  { value: "nuts_seeds", label: "🥜 Orechy & semená" },
  { value: "other", label: "📦 Ostatné" },
];

const COMMON_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "ks",
  "bal",
  "dl",
  "cup",
  "tbsp",
  "tsp",
];

interface AddPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: NewPantryItem) => Promise<boolean>;
}

export default function AddPantryItemModal({
  isOpen,
  onClose,
  onAdd,
}: AddPantryItemModalProps) {
  const t = useTranslations("pantry");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("ks");
  const [category, setCategory] = useState("other");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setQuantity("");
    setUnit("ks");
    setCategory("other");
    setExpiryDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onAdd({
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        category,
        expiryDate: expiryDate ? `${expiryDate}T12:00:00` : null,
      });
      if (success) {
        reset();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {t("modal_title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label
                  htmlFor="pantry-name"
                  className="text-sm font-medium text-gray-700 mb-1.5 block"
                >
                  Názov *
                </Label>
                <Input
                  id="pantry-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="napr. Mlieko, Jablká, Cestoviny..."
                  required
                  autoFocus
                  className="w-full"
                />
              </div>

              {/* Quantity + Unit */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label
                    htmlFor="pantry-qty"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Množstvo
                  </Label>
                  <Input
                    id="pantry-qty"
                    type="number"
                    min="0"
                    step="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="napr. 500"
                    className="w-full"
                  />
                </div>
                <div className="w-28">
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Jednotka
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Kategória
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Date (optional) */}
              <div>
                <Label
                  htmlFor="pantry-expiry"
                  className="text-sm font-medium text-gray-700 mb-1.5 block"
                >
                  Dátum expirácie{" "}
                  <span className="text-gray-400 font-normal">(voliteľné)</span>
                </Label>
                <Input
                  id="pantry-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Zrušiť
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Pridať
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
