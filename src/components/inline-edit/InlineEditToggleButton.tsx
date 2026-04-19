"use client";

import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils/utils";

interface InlineEditToggleButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
}

export default function InlineEditToggleButton({
  label,
  isActive,
  onClick,
  disabled = false,
  className,
  iconClassName,
}: InlineEditToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isActive
          ? "border-eatrivo-purple bg-eatrivo-purple text-white"
          : "border-gray-200 bg-white text-gray-500 hover:bg-eatrivo-blue/10 hover:text-eatrivo-blue",
        className,
      )}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
    >
      <Pencil className={cn("h-4 w-4", iconClassName)} />
    </button>
  );
}