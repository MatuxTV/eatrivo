"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

interface RivoCustomRecipeButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Primary purple CTA that kicks off Rivo custom recipe generation. */
export function RivoCustomRecipeButton({
  label,
  onClick,
  disabled,
  className,
}: RivoCustomRecipeButtonProps) {
  return (
    <Button
      variant="brand"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-11 w-full rounded-[1.1rem] px-4 text-sm", className)}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
