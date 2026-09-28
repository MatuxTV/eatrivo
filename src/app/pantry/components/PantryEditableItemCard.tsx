"use client";

import { Trash2, Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

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
  trackingMode: "quantity" | "availability";
  inStock: boolean;
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
    trackingModeToggleLabel?: string;
    trackingModeHelpText?: string;
    fieldAvailability?: string;
    availableLabel?: string;
    unavailableLabel?: string;
  };
  autoFocus?: boolean;
  canRemove?: boolean;
  showTrackingControls?: boolean;
  onChange: (
    id: string,
    field: keyof Omit<EditablePantryFormItem, "id">,
    value: EditablePantryFormItem[keyof Omit<EditablePantryFormItem, "id">],
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
  showTrackingControls = false,
  onChange,
  onRemove,
}: PantryEditableItemCardProps) {
  const isAvailabilityMode =
    showTrackingControls && item.trackingMode === "availability";

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

        <div className={`flex gap-3 ${isAvailabilityMode ? "opacity-55" : ""}`}>
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
              disabled={isAvailabilityMode}
            />
          </div>
          <div className="w-28">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700">
              {labels.fieldUnit}
            </Label>
            <Select
              value={item.unit}
              onValueChange={(value) => onChange(item.id, "unit", value)}
              disabled={isAvailabilityMode}
            >
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

        {showTrackingControls ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-700">
                  {labels.trackingModeToggleLabel}
                </span>
                {labels.trackingModeHelpText ? (
                  <Tooltip.Provider delayDuration={120}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-eatrivo-purple/20 hover:text-eatrivo-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                          aria-label={labels.trackingModeHelpText}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="z-50 max-w-[240px] rounded-lg border border-white/10 bg-eatrivo-black-primary/95 px-3 py-2 text-xs font-medium leading-snug text-white shadow-xl shadow-eatrivo-purple/10 backdrop-blur-md"
                          sideOffset={6}
                          side="top"
                        >
                          {labels.trackingModeHelpText}
                          <Tooltip.Arrow className="fill-eatrivo-black-primary/95" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isAvailabilityMode}
                onClick={() =>
                  onChange(
                    item.id,
                    "trackingMode",
                    isAvailabilityMode ? "quantity" : "availability",
                  )
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 ${
                  isAvailabilityMode
                    ? "border-eatrivo-purple/20 bg-eatrivo-purple"
                    : "border-gray-200 bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isAvailabilityMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {isAvailabilityMode ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {labels.fieldAvailability}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(item.id, "inStock", true)}
                    aria-pressed={item.inStock}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                      item.inStock
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {labels.availableLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(item.id, "inStock", false)}
                    aria-pressed={!item.inStock}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                      !item.inStock
                        ? "border-gray-300 bg-gray-100 text-gray-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {labels.unavailableLabel}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

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