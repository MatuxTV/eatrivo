"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface PantryQuantityWheelProps {
  value: number | null;
  unit: string | null;
  onChange: (value: number) => void;
}

function getStepForUnit(unit: string | null): number {
  switch ((unit ?? "").toLowerCase()) {
    case "g":
    case "ml":
      return 50;
    case "kg":
    case "l":
      return 0.1;
    case "dl":
      return 0.5;
    case "tsp":
    case "tbsp":
      return 0.5;
    case "ks":
    default:
      return 1;
  }
}

function getDefaultForUnit(unit: string | null): number {
  switch ((unit ?? "").toLowerCase()) {
    case "g":
      return 300;
    case "ml":
      return 500;
    case "kg":
    case "l":
      return 1;
    case "dl":
      return 5;
    case "tsp":
    case "tbsp":
    case "ks":
    default:
      return 1;
  }
}

function roundValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatValue(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("sk-SK", { maximumFractionDigits: 2 });
}

export default function PantryQuantityWheel({
  value,
  unit,
  onChange,
}: PantryQuantityWheelProps) {
  const triggerHaptic = useHapticFeedback();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const step = getStepForUnit(unit);
  const currentValue = value ?? getDefaultForUnit(unit);
  const options = useMemo(() => {
    return Array.from({ length: 9 }, (_, index) => {
      const candidate = currentValue + (index - 4) * step;
      return roundValue(Math.max(step, candidate));
    });
  }, [currentValue, step]);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option === currentValue);
    if (selectedIndex >= 0) {
      buttonRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentValue, options]);

  const handleSelect = (nextValue: number) => {
    onChange(nextValue);
    triggerHaptic("light");
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 px-2 py-2 shadow-inner">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleSelect(roundValue(Math.max(step, currentValue - step)))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 active:scale-95"
          aria-label="Decrease quantity"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
          <div className="flex min-w-max items-center gap-2 px-1">
            {options.map((option, index) => {
              const isSelected = option === currentValue;

              return (
                <button
                  key={`${option}-${index}`}
                  ref={(element) => {
                    buttonRefs.current[index] = element;
                  }}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`snap-center rounded-2xl px-3 py-2 text-sm font-bold transition-all active:scale-95 ${
                    isSelected
                      ? "bg-eatrivo-purple text-white shadow-lg shadow-eatrivo-purple/20"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                  aria-pressed={isSelected}
                >
                  {formatValue(option)}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleSelect(roundValue(currentValue + step))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 active:scale-95"
          aria-label="Increase quantity"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-baseline justify-center gap-1 text-center">
        <span className="text-lg font-black tracking-tight text-[#1a1a2e]">
          {formatValue(currentValue)}
        </span>
        {unit ? (
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1">
        {options.map((option, index) => (
          <span
            key={`${option}-tick-${index}`}
            className={`h-1.5 rounded-full transition-all ${
              option === currentValue
                ? "w-5 bg-eatrivo-purple"
                : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}