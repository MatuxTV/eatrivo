import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeShoppingListAmount,
  parseShoppingListAmountLabel,
} from "./shopping-list-amount";

test("normalizeShoppingListAmount accepts complete quantity and unit pairs", () => {
  assert.deepEqual(normalizeShoppingListAmount(2, "pc"), {
    ok: true,
    quantity: 2,
    unit: "ks",
    amountLabel: "2 ks",
  });
});

test("normalizeShoppingListAmount rejects quantity without unit", () => {
  assert.deepEqual(normalizeShoppingListAmount(2, null), {
    ok: false,
    code: "amount_requires_unit",
    message: "Quantity requires an explicit unit",
  });
});

test("normalizeShoppingListAmount rejects unit without quantity", () => {
  assert.deepEqual(normalizeShoppingListAmount(null, "ks"), {
    ok: false,
    code: "unit_requires_amount",
    message: "Unit requires an explicit quantity",
  });
});

test("parseShoppingListAmountLabel requires explicit units in amount labels", () => {
  assert.deepEqual(parseShoppingListAmountLabel("1"), {
    ok: false,
    code: "invalid_amount_label",
    message: "Amount label must include both quantity and unit",
  });
  assert.deepEqual(parseShoppingListAmountLabel("1 pc"), {
    ok: true,
    quantity: 1,
    unit: "ks",
    amountLabel: "1 ks",
  });
});