// Pantry category visuals. The translated category labels already start with an emoji
// ("🥛 Mliečne výrobky"); the list shows it in a tinted tile and the name next to it.

const CATEGORY_TINTS: Record<string, string> = {
  grains: "bg-[#FFEDD5]",
  fruit: "bg-[#FFDCE9]",
  other: "bg-[#F6EDFF]",
  eggs: "bg-[#FFF4D6]",
  dairy: "bg-[#EFE3FF]",
  vegetables: "bg-[#DCFCE7]",
  meat_fish: "bg-[#FFE4E1]",
  condiments: "bg-[#DDF7EE]",
  beverages: "bg-[#E0F2FE]",
  nuts_seeds: "bg-[#FDE9D3]",
};

const FALLBACK_TINT = "bg-[#F6EDFF]";

export function getCategoryTint(category: string): string {
  return CATEGORY_TINTS[category] ?? FALLBACK_TINT;
}

const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+(.+)$/u;

export function splitCategoryLabel(label: string): {
  emoji: string | null;
  name: string;
} {
  const match = LEADING_EMOJI.exec(label.trim());

  if (!match) {
    return { emoji: null, name: label.trim() };
  }

  return { emoji: match[1], name: match[2] };
}
