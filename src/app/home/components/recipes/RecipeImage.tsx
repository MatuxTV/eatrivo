import Image from "next/image";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getRecipeVisual } from "@/lib/recipes/recipe-visuals";
import { cn } from "@/lib/utils/utils";

interface RecipeImageProps {
  categoryKey?: string | null;
  src?: string | null;
  alt?: string;
  className?: string;
  emojiClassName?: string;
  /** A photo is being generated: show a skeleton instead of the emoji tile. */
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Recipe artwork slot: renders the recipe photo when there is one, otherwise an
 * emoji tile tinted by the recipe's category (or a skeleton while a photo is
 * still being generated). Callers set the height via
 * `className` and position overlays (badges, bookmark button) through
 * `children`.
 */
export function RecipeImage({
  categoryKey,
  src,
  alt = "",
  className,
  emojiClassName,
  loading = false,
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
      ) : loading ? (
        <Skeleton
          className="h-full w-full rounded-none bg-gray-200/80"
          role="status"
          aria-busy="true"
          aria-label={alt}
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
