---
status: resolved
trigger: "custom recipe generation fails with Gemini response_schema 400 unknown const"
created: 2026-03-23T09:10:24Z
updated: 2026-03-23T09:16:28Z
---

## Current Focus

hypothesis: Confirmed. Function-calling structured output returns usable structured arguments for this payload shape.
test: Switched withStructuredOutput from jsonSchema to functionCalling while keeping the loose compatibility schema and existing strict validator.
expecting: structuredParseSucceeded becomes true and normalized JSON reaches validateRecipeJson without the repeated 400-500 char truncation pattern.
next_action: closed

## Symptoms

expected: Custom recipe generation should call Gemini once and return structured recipe candidates.
actual: Gemini rejects the request immediately with 400 Bad Request before generation starts, all retries fail, and fallback recipes are returned.
errors: Invalid JSON payload received. Unknown name "const" at generation_config.response_schema...
reproduction: POST /api/recipes/custom/generate for authenticated user with populated pantry.
started: After switching recipeRequest to withStructuredOutput(jsonSchema).

## Eliminated

## Evidence

- timestamp: 2026-03-23T09:10:24Z
  checked: runtime logs
  found: Gemini rejects response_schema because generated payload contains const inside any_of branches.
  implication: Current Zod schema is not directly compatible with Gemini responseSchema conversion.

- timestamp: 2026-03-23T09:16:00Z
  checked: LangChain Google GenAI implementation and current recipe schema
  found: withStructuredOutput(jsonSchema) is supported, but the strict recipe schema uses literal/union shapes that are lowered into Gemini-incompatible responseSchema fields.
  implication: A Gemini-facing compatibility schema is required instead of sending the app's strict schema directly.

- timestamp: 2026-03-23T09:18:30Z
  checked: fresh runtime logs after compatibility schema patch
  found: Gemini no longer returns 400 schema errors, but jsonSchema mode still produces ~400-500 char malformed fragments and structuredParseSucceeded stays false.
  implication: transport compatibility is fixed, but the selected structured output method is still unreliable for this payload shape.

- timestamp: 2026-03-23T09:16:28Z
  checked: fresh runtime logs after functionCalling patch
  found: structuredParseSucceeded became true on the first attempt, normalized output length was 3824, strict validation succeeded, fallbackUsed was false, and total request time dropped to 16900ms.
  implication: the root issue is resolved and the functionCalling transport is reliable for this workflow.

## Resolution

root_cause: Gemini rejects the original strict response schema because the app Zod schema lowers into unsupported const fields, and jsonSchema mode remained unreliable for this larger nested payload even after a compatibility schema patch.
fix: recipeRequest now uses a Gemini-compatible loose schema with functionCalling structured output, then serializes the parsed object back into JSON for the existing strict validator.
verification: User-provided production logs show first-attempt structured parsing succeeded, strict validation succeeded, fallback was not used, and endpoint latency dropped to 16.9s.
files_changed: ["src/lib/langgraph/custom-recipe/nodes/recipeRequest.ts"]
