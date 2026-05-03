import type { BasicHomeRecipePreview } from "@/app/home/types/data";

export function shuffleRecipesByTime(
  recipes: BasicHomeRecipePreview[],
  timeSeed: number,
): BasicHomeRecipePreview[] {
  if (recipes.length <= 1) {
    return recipes;
  }

  const shuffled = [...recipes];
  let seed = timeSeed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}