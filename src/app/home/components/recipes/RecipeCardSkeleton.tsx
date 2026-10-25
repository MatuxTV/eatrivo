import { cn } from "@/lib/utils/utils";

interface RecipeCardSkeletonProps {
  delayed?: boolean;
}

/** Loading placeholder mirroring the {@link RecipeCard} layout. */
export function RecipeCardSkeleton({ delayed }: RecipeCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white",
        delayed && "[animation-delay:120ms]",
      )}
    >
      <div className="h-28 w-full bg-gray-100" />

      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <div className="h-4 w-[88%] rounded bg-gray-100" />
        <div className="h-4 w-[62%] rounded bg-gray-100" />
        <div className="mt-1.5 h-4 w-[46%] rounded bg-gray-100" />
        <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100" />
        <div className="mt-1.5 h-3 w-[70%] rounded bg-gray-100" />
      </div>
    </div>
  );
}
