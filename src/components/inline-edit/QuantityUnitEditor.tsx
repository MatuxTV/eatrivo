"use client";

import type { KeyboardEventHandler } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";

interface QuantityUnitEditorProps {
  quantityLabel: string;
  unitLabel: string;
  quantityPlaceholder: string;
  unitPlaceholder: string;
  cancelLabel: string;
  saveLabel: string;
  quantityValue: string;
  unitValue: string;
  isSaving: boolean;
  inputId?: string;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onQuantityKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export default function QuantityUnitEditor({
  quantityLabel,
  unitLabel,
  quantityPlaceholder,
  unitPlaceholder,
  cancelLabel,
  saveLabel,
  quantityValue,
  unitValue,
  isSaving,
  inputId,
  onQuantityChange,
  onUnitChange,
  onCancel,
  onSave,
  onQuantityKeyDown,
}: QuantityUnitEditorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
      <div className="flex-1">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {quantityLabel}
        </p>
        <Input
          id={inputId}
          type="number"
          min="0"
          step="0.001"
          value={quantityValue}
          onChange={(event) => onQuantityChange(event.target.value)}
          onKeyDown={onQuantityKeyDown}
          placeholder={quantityPlaceholder}
          className="h-10 rounded-xl border-gray-200 bg-white"
          autoFocus
        />
      </div>

      <div className="flex-1">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {unitLabel}
        </p>
        <Select value={unitValue} onValueChange={onUnitChange}>
          <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white shadow-none">
            <SelectValue placeholder={unitPlaceholder} />
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          aria-label={cancelLabel}
          title={cancelLabel}
        >
          <X className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-eatrivo-purple text-white transition-colors hover:bg-eatrivo-purple/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          aria-label={saveLabel}
          title={saveLabel}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}