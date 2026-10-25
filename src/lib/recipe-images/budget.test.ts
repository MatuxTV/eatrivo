import test from "node:test";
import assert from "node:assert/strict";

import { canSpend, monthKey } from "./budget";

test("monthKey formats the UTC month", () => {
  assert.equal(monthKey(new Date("2026-10-22T10:00:00Z")), "2026-10");
  assert.equal(monthKey(new Date("2026-01-01T00:00:00Z")), "2026-01");
});

test("canSpend allows spending up to the budget and blocks a zero budget", () => {
  assert.equal(canSpend(9.96, 0.039, 10), true);
  assert.equal(canSpend(9.99, 0.039, 10), false);
  assert.equal(canSpend(0, 0.039, 0), false);
});
