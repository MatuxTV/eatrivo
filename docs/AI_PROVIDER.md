# AI provider

**Branch:** `beta-pantry_rework` · **Date:** 2026-10-20

All LLM calls in the app go through one factory. Default provider is Anthropic with `claude-haiku-5-5` for every feature; Gemini is kept as a rollback.

## Configuration
| Env | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | key for the default provider |
| `GOOGLE_AI_API_KEY` | key for the Gemini rollback |
| `AI_PROVIDER` | `anthropic` \| `google` (`openrouter` is not wired up). Unset: `anthropic` when `ANTHROPIC_API_KEY` is set, else `google` |
| `AI_MODEL_<FEATURE>` | per-feature model override, e.g. `AI_MODEL_CUSTOM_RECIPE=claude-sonnet-5-5`, `AI_MODEL_RECEIPT_SCAN=...` |

Features (`src/lib/ai/model-config.ts`): `chat`, `intent`, `customRecipe`, `unitAudit`, `recipeImport`, `pantryNormalize`, `ingredientClassify`, `receiptScan`, `shoppingList`, `photoRecognition`, `photoMerge`. Token limits, effort and streaming are set per feature in the same file.

## Code map
- `src/lib/ai/model-config.ts` pure config and provider rules; `model-factory.ts` builds the models (CLI scripts and tests import this one); `models.ts` is the `server-only` re-export that app code imports.
- `src/lib/ai/message-text.ts`: plain text of a reply (Claude returns content blocks). Never read `message.content` as a string.
- `src/lib/ai/structured-output.ts` (`invokeStructured`): forced-tool structured output plus recovery of tool arguments that Claude sometimes returns as a JSON string with trailing characters. Use it instead of calling `withStructuredOutput` directly.
- `src/lib/ai/usage-log.ts`: logs tokens, latency and stop reason per call; warns on `max_tokens` / `refusal`.

## Claude Haiku 5.5 rules the factory applies
- No `temperature` / `top_p` / `top_k` (HTTP 400). `maxTokens` is always set (the LangChain default would be 4096).
- Thinking is disabled (`thinking: {type: "disabled"}`) with `effort` low or medium, so replies are plain text blocks and forced tool calls are accepted.
- Do not use `strict` or `method: "jsonSchema"` with the custom recipe schema: the API rejects it as too complex.
- There is no EU inference region (only `global` or `us`).

## Measured on 2026-10-20 (small sample, Haiku 5.5 vs Gemini)
| Check | Haiku 5.5 | Gemini |
|---|---|---|
| Receipt scan, 20 synthetic Slovak receipts | recall and precision 98.8%, ~6 s each | 97%, ~73 s each (2.5 Pro, 3 in parallel) |
| Pantry normalization, 10 strings | 10/10, 5.4 s, includes category, confidence, reason and specific keys | 10/10, 15.3 s, those fields empty |
| Custom recipes, 10 prompts | 7-9 of 10 valid on the first attempt (graph retries cover the rest), ~14 s each, no real allergen violation | 10/10, ~6 s |
Caveats: the receipts are clean synthetic images, not photos; the recipe allergen check is a keyword match (its two hits were false alarms: coconut milk, "bez vajec"); no Slovak quality benchmark exists for either model.

## Not done
- Privacy policy still names OpenAI and needs Anthropic as processor (legal text, owner decision, version bump and notice).
- `ai_request` analytics events (needs a user id at the call site); usage is only logged.
- Real grocery photos for photo scan were not tested.
