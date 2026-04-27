"use client";

import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PANTRY_UNIT_OPTIONS } from "@/lib/ingredients/units";

export interface EditablePantryFormItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expiryDate: string;
}

interface PantryEditableItemCardProps {
  item: EditablePantryFormItem;
  index: number;
  categories: Array<{ value: string; label: string }>;
  labels: {
    itemLabel: string;
    fieldName: string;
    fieldNamePlaceholder: string;
    fieldQuantity: string;
    fieldQuantityPlaceholder: string;
    fieldUnit: string;
    fieldCategory: string;
    fieldExpiry: string;
    fieldOptional: string;
  };
  autoFocus?: boolean;
  canRemove?: boolean;
  onChange: (
    id: string,
    field: keyof Omit<EditablePantryFormItem, "id">,
    value: string,
  ) => void;
  onRemove: (id: string) => void;
}

export default function PantryEditableItemCard({
  item,
  index,
  categories,
  labels,
  autoFocus = false,
  canRemove = true,
  onChange,
  onRemove,
}: PantryEditableItemCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-eatrivo-purple text-xs text-white">
            {index + 1}
          </div>
          {labels.itemLabel}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-gray-700">
            {labels.fieldName} *
          </Label>
          <Input
            value={item.name}
            onChange={(event) => onChange(item.id, "name", event.target.value)}
            placeholder={labels.fieldNamePlaceholder}
            autoFocus={autoFocus}
            className="w-full bg-white"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700">
              {labels.fieldQuantity}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={item.quantity}
              onChange={(event) => onChange(item.id, "quantity", event.target.value)}
              placeholder={labels.fieldQuantityPlaceholder}
              className="w-full bg-white"
            />
          </div>
          <div className="w-28">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700">
              {labels.fieldUnit}
            </Label>
            <Select value={item.unit} onValueChange={(value) => onChange(item.id, "unit", value)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
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
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium text-gray-700">
            {labels.fieldCategory}
          </Label>
          <Select value={item.category} onValueChange={(value) => onChange(item.id, "category", value)}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium text-gray-700">
            {labels.fieldExpiry}{" "}
            <span className="font-normal text-gray-400">({labels.fieldOptional})</span>
          </Label>
          <Input
            type="date"
            value={item.expiryDate}
            onChange={(event) => onChange(item.id, "expiryDate", event.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}