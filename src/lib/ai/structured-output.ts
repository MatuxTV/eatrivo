import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import type { z } from "zod";

/** Returns the first complete JSON object/array found at the start of `text` (trailing garbage ignored), else undefined. */
export function parseFirstJsonValue(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/**
 * Walks tool-call arguments and replaces string values that look like JSON objects/arrays
 * with the parsed value. Only use this as a recovery step after normal parsing failed.
 */
export function recoverToolArgs(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^\s*[[{]/.test(value)) {
      const parsed = parseFirstJsonValue(value);
      if (parsed !== undefined) {
        return recoverToolArgs(parsed);
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => recoverToolArgs(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, recoverToolArgs(entry)]),
    );
  }
  return value;
}

export interface StructuredResult<T> {
  parsed: T | null;
  raw: unknown;
  /** true when the result only validated after recoverToolArgs */
  repaired: boolean;
  issues: string[] | null;
}

/**
 * `withStructuredOutput(functionCalling, includeRaw)` plus recovery of stringified tool arguments.
 * Never throws for a schema mismatch: returns `parsed: null` with `issues`.
 */
export async function invokeStructured<T>(input: {
  model: BaseChatModel;
  schema: z.ZodType<T>;
  name: string;
  messages: BaseMessage[];
}): Promise<StructuredResult<T>> {
  const structured = input.model.withStructuredOutput(input.schema as never, {
    method: "functionCalling",
    name: input.name,
    includeRaw: true,
  });
  const result = (await structured.invoke(input.messages)) as { raw: unknown; parsed: T | null };

  if (result.parsed) {
    return { parsed: result.parsed, raw: result.raw, repaired: false, issues: null };
  }

  const args = (result.raw as { tool_calls?: { args?: unknown }[] } | undefined)?.tool_calls?.[0]?.args;
  const check = input.schema.safeParse(recoverToolArgs(args));
  if (check.success) {
    return { parsed: check.data, raw: result.raw, repaired: true, issues: null };
  }

  return {
    parsed: null,
    raw: result.raw,
    repaired: false,
    issues: check.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}
