import { cn } from "@/lib/utils/utils";

interface PantryMatchBarProps {
  have: number;
  total: number;
  className?: string;
}

const MAX_SEGMENTS = 12;
const COMPLETE_SEGMENT_CLASS = "bg-green-500";
const HAVE_SEGMENT_CLASS = "bg-eatrivo-purple";
const EMPTY_SEGMENT_CLASS = "bg-orange-300";

/**
 * Pantry coverage indicator. Up to 12 ingredients it renders one segment per
 * ingredient, above that a single track with a proportional fill.
 */
export function PantryMatchBar({ have, total, className }: PantryMatchBarProps) {
  if (total <= 0) {
    return null;
  }

  const safeHave = Math.min(Math.max(have, 0), total);
  const isComplete = safeHave >= total;
  const fillClass = isComplete ? COMPLETE_SEGMENT_CLASS : HAVE_SEGMENT_CLASS;

  return (
    <div
      role="img"
      aria-label={`${have}/${total}`}
      className={cn("flex gap-0.5", className)}
    >
      {total <= MAX_SEGMENTS ? (
        Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              isComplete
                ? COMPLETE_SEGMENT_CLASS
                : index < safeHave
                  ? HAVE_SEGMENT_CLASS
                  : EMPTY_SEGMENT_CLASS,
            )}
          />
        ))
      ) : (
        <div className={cn("h-1 w-full overflow-hidden rounded-full", EMPTY_SEGMENT_CLASS)}>
          <div
            className={cn("h-full rounded-full", fillClass)}
            style={{ width: `${(safeHave / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
