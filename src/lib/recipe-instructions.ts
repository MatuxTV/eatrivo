export interface RecipeInstruction {
  title: string;
  text: string;
}

type RecipeInstructionCandidate =
  | string
  | {
      title?: unknown;
      text?: unknown;
      description?: unknown;
      body?: unknown;
      step?: unknown;
      content?: unknown;
    };

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRecipeInstructions(
  instructions: unknown,
): RecipeInstruction[] {
  if (!Array.isArray(instructions)) {
    return [];
  }

  return instructions.flatMap((instruction) => {
    if (typeof instruction === "string") {
      const text = instruction.trim();
      return text ? [{ title: "", text }] : [];
    }

    if (!instruction || typeof instruction !== "object") {
      return [];
    }

    const candidate = instruction as RecipeInstructionCandidate;
    const title = toTrimmedString(candidate.title);
    const text =
      toTrimmedString(candidate.text) ||
      toTrimmedString(candidate.description) ||
      toTrimmedString(candidate.body) ||
      toTrimmedString(candidate.step) ||
      toTrimmedString(candidate.content);

    if (!title && !text) {
      return [];
    }

    return [
      {
        title,
        text,
      },
    ];
  });
}