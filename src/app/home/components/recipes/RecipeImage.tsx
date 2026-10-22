import Image from "next/image";
import type { ReactNode } from "react";

import { getRecipeVisual } from "@/lib/recipes/recipe-visuals";
import { cn } from "@/lib/utils/utils";

interface RecipeImageProps {
  categoryKey?: string | null;
  src?: string | null;
  alt?: string;
  className?: string;
  emojiClassName?: string;
  children?: ReactNode;
}

/**
 * Recipe artwork slot: renders the recipe photo when there is one, otherwise an
 * emoji tile tinted by the recipe's category. Callers set the height via
 * `className` and position overlays (badges, bookmark button) through
 * `children`.
 */
export function RecipeImage({
  categoryKey,
  src,
  alt = "",
  className,
  emojiClassName,
  children,
}: RecipeImageProps) {
  const visual = getRecipeVisual(categoryKey);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundColor: visual.tint }}
          aria-hidden="true"
        >
          <span className={cn("text-[44px] leading-none", emojiClassName)}>
            {visual.emoji}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
