import type { CustomRecipePantryContextItem } from "@/lib/custom-recipes/contracts";

function stringifyCustomRecipePantryItem(
  pantryItem: CustomRecipePantryContextItem,
): string {
  if (pantryItem.trackingMode === "availability") {
    return pantryItem.pantryName;
  }

  const amount = pantryItem.quantity
    ? `${pantryItem.quantity}${pantryItem.unit ? ` ${pantryItem.unit}` : ""}`
    : "quantity unknown";

  return `${pantryItem.pantryName} (${amount})`;
}

export function buildPantryPromptContext(
  pantryRows: CustomRecipePantryContextItem[],
): {
  summary: string;
  quantityTrackedCount: number;
  availabilityStapleCount: number;
  stapleNames: string[];
} {
  const availableRows = pantryRows.filter((row) => row.inStock);
  const quantityTrackedItems = availableRows.filter(
    (row) => row.trackingMode !== "availability",
  );
  const availabilityStaples = availableRows.filter(
    (row) => row.trackingMode === "availability",
  );

  const quantitySection = quantityTrackedItems.length
    ? quantityTrackedItems
        .map((item) => `- ${stringifyCustomRecipePantryItem(item)}`)
        .join("\n")
    : "- none";
  const stapleSection = availabilityStaples.length
    ? availabilityStaples
        .map((item) => `- ${stringifyCustomRecipePantryItem(item)}`)
        .join("\n")
    : "- none";

  return {
    summary: [
      "Tracked pantry items with quantities:",
      quantitySection,
      "",
      "Always-available staples already in stock:",
      stapleSection,
    ].join("\n"),
    quantityTrackedCount: quantityTrackedItems.length,
    availabilityStapleCount: availabilityStaples.length,
    stapleNames: availabilityStaples.map((item) => item.pantryName),
  };
}