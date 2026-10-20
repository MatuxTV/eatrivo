import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { planDraftMerge } from "./draft-merge";
import type { ExistingPantryRowForMerge } from "./draft-merge";
import type { PantryDraftItem } from "./draft-cache";

function draft(over: Partial<PantryDraftItem> & { token: string; name: string }): PantryDraftItem {
  return {
    ingredientName: null,
    ingredientKey: null,
    ingredientSpecificKey: null,
    trackingMode: "availability",
    inStock: true,
    quantity: null,
    unit: null,
    category: null,
    expiryDate: null,
    candidateKeys: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:30:00.000Z",
    ...over,
  };
}

function row(over: Partial<ExistingPantryRowForMerge> & { id: string; name: string }): ExistingPantryRowForMerge {
  return {
    ingredientKey: null,
    ingredientSpecificKey: null,
    inStock: true,
    ...over,
  };
}

describe("planDraftMerge", () => {
  it("case 1: no existing rows, 2 distinct drafts are both inserted", () => {
    const drafts = [
      draft({ token: "t1", name: "Mlieko" }),
      draft({ token: "t2", name: "Chlieb" }),
    ];

    const plan = planDraftMerge(drafts, []);

    assert.equal(plan.toInsert.length, 2);
    assert.deepEqual(
      plan.toInsert.map((item) => item.token),
      ["t1", "t2"],
    );
    assert.deepEqual(plan.restockRowIds, []);
    assert.equal(plan.mergedCount, 0);
  });

  it("case 2: draft matching an existing in-stock row by ingredientKey is merged", () => {
    const drafts = [draft({ token: "t1", name: "Mlieko", ingredientKey: "milk" })];
    const rows = [row({ id: "r1", name: "Mlieko", ingredientKey: "milk", inStock: true })];

    const plan = planDraftMerge(drafts, rows);

    assert.deepEqual(plan.toInsert, []);
    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.restockRowIds, []);
  });

  it("case 3: draft matching an existing out-of-stock row by ingredientSpecificKey triggers restock", () => {
    const drafts = [
      draft({ token: "t1", name: "Mlieko", ingredientSpecificKey: "milk-fresh" }),
    ];
    const rows = [
      row({
        id: "r1",
        name: "Mlieko",
        ingredientSpecificKey: "milk-fresh",
        inStock: false,
      }),
    ];

    const plan = planDraftMerge(drafts, rows);

    assert.deepEqual(plan.toInsert, []);
    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.restockRowIds, ["r1"]);
  });

  it("case 4: match by normalized name only when all keys are null", () => {
    const drafts = [draft({ token: "t1", name: "mlieko polotučné" })];
    const rows = [row({ id: "r1", name: "  Mlieko  polotučné ", inStock: true })];

    const plan = planDraftMerge(drafts, rows);

    assert.deepEqual(plan.toInsert, []);
    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.restockRowIds, []);
  });

  it("case 5: two drafts with the same ingredientKey in one batch merge into the first only", () => {
    const drafts = [
      draft({ token: "t1", name: "Mlieko", ingredientKey: "milk" }),
      draft({ token: "t2", name: "Mlieko polotučné", ingredientKey: "milk" }),
    ];

    const plan = planDraftMerge(drafts, []);

    assert.deepEqual(
      plan.toInsert.map((item) => item.token),
      ["t1"],
    );
    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.restockRowIds, []);
  });

  it("case 6: draft with inStock=false does not restock an out-of-stock existing row", () => {
    const drafts = [
      draft({
        token: "t1",
        name: "Mlieko",
        ingredientKey: "milk",
        inStock: false,
      }),
    ];
    const rows = [row({ id: "r1", name: "Mlieko", ingredientKey: "milk", inStock: false })];

    const plan = planDraftMerge(drafts, rows);

    assert.deepEqual(plan.toInsert, []);
    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.restockRowIds, []);
  });

  it("case 7: different ingredientKey but same name still merges (name fallback)", () => {
    const drafts = [draft({ token: "t1", name: "Soľ", ingredientKey: "salt-new" })];
    const rows = [row({ id: "r1", name: "Soľ", ingredientKey: "salt-old", inStock: true })];

    const plan = planDraftMerge(drafts, rows);

    assert.equal(plan.mergedCount, 1);
    assert.deepEqual(plan.toInsert, []);
  });

  it("case 8: empty drafts produce an empty plan", () => {
    const plan = planDraftMerge([], []);

    assert.deepEqual(plan.toInsert, []);
    assert.deepEqual(plan.restockRowIds, []);
    assert.equal(plan.mergedCount, 0);
  });
});
