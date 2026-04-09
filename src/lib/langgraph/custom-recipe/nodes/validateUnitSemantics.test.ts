import assert from "node:assert/strict";
import test from "node:test";

import { normalizeUnitSemanticAudit } from "./validateUnitSemantics";

test("normalizeUnitSemanticAudit ignores produce gram-to-piece suggestions", () => {
  const audit = normalizeUnitSemanticAudit({
    passed: false,
    issues: [
      {
        recipeKind: "pantry",
        ingredientName: "mrkva",
        currentAmount: "300 g",
        suggestedAmount: "3",
        suggestedUnit: "ks",
        reason: "Prefer count-based produce",
      },
    ],
  });

  assert.deepEqual(audit, { passed: true, issues: [] });
});

test("normalizeUnitSemanticAudit keeps non-produce semantic issues", () => {
  const audit = normalizeUnitSemanticAudit({
    passed: false,
    issues: [
      {
        recipeKind: "pantry",
        ingredientName: "olivový olej",
        currentAmount: "2 ks",
        suggestedAmount: "30",
        suggestedUnit: "ml",
        reason: "Oil must be measured as liquid",
      },
    ],
  });

  assert.equal(audit.passed, false);
  assert.equal(audit.issues.length, 1);
  assert.equal(audit.issues[0]?.ingredientName, "olivový olej");
});