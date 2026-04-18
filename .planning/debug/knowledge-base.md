# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## custom-recipe-schema-const-error — Gemini structured recipe generation failed due to incompatible schema transport
- **Date:** 2026-03-23
- **Error patterns:** custom recipe, response_schema, const, Gemini, jsonSchema, structuredParseSucceeded false, truncated output
- **Root cause:** Gemini rejected the strict app schema because it lowered to unsupported const fields, and jsonSchema mode remained unreliable for this larger nested payload even after a compatibility schema patch.
- **Fix:** Switched recipeRequest to a Gemini-compatible loose schema with functionCalling structured output, then serialized the parsed object back into JSON for the existing strict validator.
- **Files changed:** src/lib/langgraph/custom-recipe/nodes/recipeRequest.ts
---
